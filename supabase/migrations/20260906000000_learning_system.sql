-- LOCK — the learning system
--
-- Phase → Module → Lesson, the learner state hanging off `profiles`, and two
-- `security definer` functions that own everything a learner must not be able
-- to write for themselves.
--
-- The security question this schema answers, and the reason it is shaped the
-- way it is: a learner holds the `authenticated` role, so anything they may
-- INSERT they may also forge. If "this answer was correct" and "this lesson is
-- complete" were ordinary columns with an update grant, LOCK would be a
-- platform where completion is a POST request. Both are therefore computed
-- inside definer functions from the lesson's own content, and the tables that
-- hold them grant no direct write at all.
--
-- Content and progress are separate trees. Phases, modules and lessons have no
-- owner and one copy; what a learner *did* hangs off `profiles`. Mixing them —
-- a lesson row per learner — is the mistake that makes editing content rewrite
-- history.

-- ────────────────────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────────────────────

-- The shapes a lesson can take. Enumerated rather than free text so the
-- renderer can switch exhaustively and a typo cannot invent a twelfth kind.
create type public.lesson_type as enum (
  'lesson', 'concept', 'visual', 'example', 'teardown', 'decision',
  'workshop', 'build', 'debug', 'case_study', 'checkpoint', 'reflection'
);

create type public.lesson_difficulty as enum ('foundational', 'intermediate', 'advanced');

-- What it takes to finish a lesson. Never "you opened the page".
create type public.completion_rule as enum (
  'read', 'knowledge_check', 'decision', 'reflection', 'practical'
);

create type public.lesson_progress_status as enum ('in_progress', 'completed');

-- The learner's own read on whether it landed. Three levels, because five is a
-- survey and two is a yes/no.
create type public.confidence_level as enum ('solid', 'shaky', 'revisit');

create type public.resource_kind as enum ('video', 'article', 'doc', 'tool', 'repo');

-- ────────────────────────────────────────────────────────────────────────────
-- Content
-- ────────────────────────────────────────────────────────────────────────────

-- Seeded from `src/lib/lock/phases.ts`, keyed on the same strings, exactly as
-- ARCHITECTURE.md said it would be. Anything already written against `think`,
-- `research` and the rest keeps working.
create table public.phases (
  key text primary key,
  position smallint not null unique,
  label text not null,
  summary text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phases_key_shape check (key ~ '^[a-z][a-z0-9_-]{1,40}$')
);

create table public.modules (
  id uuid primary key default extensions.gen_random_uuid(),
  phase_key text not null references public.phases (key) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  position smallint not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modules_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  unique (phase_key, position)
);

create index modules_phase_idx on public.modules (phase_key, position);

/*
 * `blocks` is JSONB, and that is a deliberate decision rather than a shortcut.
 *
 * A separate `lesson_content_blocks` table was the obvious alternative and it
 * buys nothing here: blocks are always read together, always written together,
 * their order is the array's order rather than a column that can disagree with
 * itself, and every block type has a different shape — so the table would
 * carry a JSONB payload column anyway, plus a position column to keep in step.
 * Adding a block type would become a migration instead of a TypeScript change.
 *
 * What JSONB costs is validation, and that is paid in one place:
 * `src/lib/learning/blocks.ts` parses every lesson through Zod on the way out
 * of the database, so a malformed block is a caught error at one boundary
 * rather than a crash inside a renderer.
 *
 * The one thing the database does enforce is that every block has a stable
 * `id`, because learner responses are keyed on it.
 */
create table public.lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  type public.lesson_type not null default 'lesson',
  difficulty public.lesson_difficulty not null default 'foundational',
  estimated_minutes smallint not null default 10,
  objectives text[] not null default '{}',
  blocks jsonb not null default '[]'::jsonb,
  completion_rule public.completion_rule not null default 'read',
  position smallint not null,
  published boolean not null default false,
  /* Demo rows exist to prove the engine runs. Flagged so the real curriculum
     can be told apart from the scaffolding, and deleted in one statement. */
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint lessons_blocks_is_array check (jsonb_typeof(blocks) = 'array'),
  constraint lessons_minutes_sane check (estimated_minutes between 1 and 600),
  unique (module_id, position)
);

create index lessons_module_idx on public.lessons (module_id, position);
create index lessons_published_idx on public.lessons (published) where published;

-- Every block carries a stable id. Responses are keyed on it, so a block that
-- loses its id would orphan somebody's answer.
create or replace function public.lesson_blocks_have_ids(blocks jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  /*
   * `coalesce` per row, not only around the aggregate. A block with no `id` at
   * all makes the comparison NULL rather than false, `bool_and` of a single
   * NULL is NULL, and the outer coalesce then turned that into `true` — so the
   * first version of this constraint accepted exactly the rows it existed to
   * refuse. The outer coalesce remains, for the genuinely empty array: a lesson
   * with no blocks yet is fine.
   */
  select coalesce(
    bool_and(
      coalesce(jsonb_typeof(block -> 'id') = 'string', false)
      and coalesce(length(block ->> 'id') between 1 and 80, false)
      and coalesce(jsonb_typeof(block -> 'kind') = 'string', false)
    ),
    true
  )
  from jsonb_array_elements(blocks) as block;
$$;

alter table public.lessons
  add constraint lessons_blocks_identified check (public.lesson_blocks_have_ids(blocks));

-- Lesson B can require Lesson A.
create table public.lesson_prerequisites (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  requires_lesson_id uuid not null references public.lessons (id) on delete cascade,
  primary key (lesson_id, requires_lesson_id),
  constraint lesson_prerequisites_not_self check (lesson_id <> requires_lesson_id)
);

create index lesson_prerequisites_requires_idx
  on public.lesson_prerequisites (requires_lesson_id);

/*
 * External material, with the reason it is attached.
 *
 * `why` is `not null` on purpose. "Watch this video" is not a teaching
 * instruction; "watch this because it demonstrates the research workflow
 * above" is. Making the column required means the schema refuses a resource
 * nobody justified.
 */
create table public.lesson_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind public.resource_kind not null,
  title text not null,
  url text not null,
  source text,
  duration_seconds integer,
  why text not null,
  start_seconds integer,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint lesson_resources_url_http check (url ~* '^https?://'),
  constraint lesson_resources_why_said check (length(btrim(why)) between 10 and 500)
);

create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id, position);

-- ────────────────────────────────────────────────────────────────────────────
-- Learner state
-- ────────────────────────────────────────────────────────────────────────────

create table public.learner_lesson_progress (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.lesson_progress_status not null default 'in_progress',
  /* Where to put them back. The id of the last block they reached. */
  last_block_id text,
  confidence public.confidence_level,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (profile_id, lesson_id),
  constraint progress_completed_has_time check (
    (status = 'completed') = (completed_at is not null)
  )
);

create index learner_progress_profile_idx
  on public.learner_lesson_progress (profile_id, updated_at desc);
-- The Revisit list, and later the "what should I learn next" question.
create index learner_progress_revisit_idx
  on public.learner_lesson_progress (profile_id)
  where confidence = 'revisit';

/*
 * One row per learner per interactive block.
 *
 * `is_correct` is null for anything with no right answer — a decision, a
 * reflection, a short answer. That is a third state and not a failure: LOCK
 * teaches judgement, and judgement is not marked.
 */
create table public.learner_block_responses (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  block_id text not null,
  response jsonb not null,
  is_correct boolean,
  attempts integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, lesson_id, block_id),
  constraint responses_attempts_positive check (attempts > 0)
);

create index learner_responses_lesson_idx
  on public.learner_block_responses (profile_id, lesson_id);

create table public.learner_lesson_notes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, lesson_id),
  constraint notes_body_length check (length(body) between 1 and 10000)
);

-- ────────────────────────────────────────────────────────────────────────────
-- updated_at
-- ────────────────────────────────────────────────────────────────────────────

create trigger phases_touch before update on public.phases
  for each row execute function public.touch_updated_at();
create trigger modules_touch before update on public.modules
  for each row execute function public.touch_updated_at();
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();
create trigger progress_touch before update on public.learner_lesson_progress
  for each row execute function public.touch_updated_at();
create trigger responses_touch before update on public.learner_block_responses
  for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.learner_lesson_notes
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- The two things a learner must not write for themselves
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Record an answer, and decide whether it was right.
 *
 * Definer, because grading has to happen somewhere the answer key is readable
 * and the caller is not. The correct answers live in `lessons.blocks`, which
 * every authenticated account can read — so the key is not a secret, and this
 * function is not pretending otherwise. What it guarantees is narrower and is
 * the part that matters: `is_correct` is *computed from the lesson* rather than
 * supplied by the caller, so a learner cannot POST themselves a pass. Hiding
 * the key from the client is a separate job for a later prompt if it is ever
 * wanted; forging the verdict is closed now.
 *
 * Ungraded kinds return null and are still recorded — a decision or a
 * reflection is evidence that the learner engaged, which is what the completion
 * rules read.
 */
create or replace function public.record_block_response(
  p_lesson_id uuid,
  p_block_id text,
  p_response jsonb
)
returns public.learner_block_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_block jsonb;
  v_kind text;
  v_correct boolean;
  v_row public.learner_block_responses;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select block into v_block
  from public.lessons l,
       lateral jsonb_array_elements(l.blocks) as block
  where l.id = p_lesson_id
    and block ->> 'id' = p_block_id
    and (l.published or public.is_staff())
  limit 1;

  if v_block is null then
    raise exception 'no such block on that lesson' using errcode = 'no_data_found';
  end if;

  v_kind := v_block ->> 'kind';

  /*
   * Graded kinds compare against the block's own answer key. The comparison is
   * order-insensitive for multi-answer questions — a learner who picks the
   * right two options in the other order has the right answer.
   */
  if v_kind in ('choice', 'boolean', 'ordering') then
    if v_kind = 'ordering' then
      v_correct := (v_block -> 'correct') = (p_response -> 'value');
    else
      v_correct := (
        select coalesce(
          (select array_agg(x order by x) from jsonb_array_elements_text(v_block -> 'correct') as x)
          =
          (select array_agg(y order by y) from jsonb_array_elements_text(p_response -> 'value') as y),
          false
        )
      );
    end if;
  else
    v_correct := null;
  end if;

  insert into public.learner_block_responses
    (profile_id, lesson_id, block_id, response, is_correct)
  values (v_uid, p_lesson_id, p_block_id, p_response, v_correct)
  on conflict (profile_id, lesson_id, block_id) do update
    set response = excluded.response,
        is_correct = excluded.is_correct,
        attempts = public.learner_block_responses.attempts + 1
  returning * into v_row;

  -- Answering anything counts as having started.
  insert into public.learner_lesson_progress (profile_id, lesson_id)
  values (v_uid, p_lesson_id)
  on conflict (profile_id, lesson_id) do nothing;

  return v_row;
end;
$$;

/*
 * Mark a lesson complete, if it has actually been earned.
 *
 * This is the function that decides what "complete" means, and it is the reason
 * `learner_lesson_progress` grants no update on `status`. Opening a page is not
 * completion; neither is a POST that says so.
 *
 *   read            — reaching the end is the requirement, and the client
 *                     saying so is acceptable evidence for a reading task.
 *   knowledge_check — every graded block in the lesson answered correctly.
 *   decision        — a decision block answered.
 *   reflection      — a reflection recorded, with something in it.
 *   practical       — refused here. Missions are Prompt 4, and until they exist
 *                     nothing can honestly verify practical work, so this
 *                     raises rather than quietly passing.
 */
create or replace function public.complete_lesson(p_lesson_id uuid)
returns public.learner_lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_rule public.completion_rule;
  v_required integer;
  v_satisfied integer;
  v_row public.learner_lesson_progress;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select completion_rule into v_rule
  from public.lessons
  where id = p_lesson_id and (published or public.is_staff());

  if v_rule is null then
    raise exception 'no such lesson' using errcode = 'no_data_found';
  end if;

  if v_rule = 'knowledge_check' then
    select count(*) into v_required
    from public.lessons l, lateral jsonb_array_elements(l.blocks) as b
    where l.id = p_lesson_id and b ->> 'kind' in ('choice', 'boolean', 'ordering');

    select count(*) into v_satisfied
    from public.learner_block_responses r
    where r.profile_id = v_uid and r.lesson_id = p_lesson_id and r.is_correct;

    if v_satisfied < v_required then
      raise exception 'knowledge check not passed' using errcode = 'check_violation';
    end if;

  elsif v_rule in ('decision', 'reflection') then
    /*
     * `cross join lateral`, not a comma. A comma is a cross join too, but the
     * JOIN below binds tighter than it does — so `b join r on ... = l.id` is
     * resolved before `l` is in scope, and Postgres rejects the reference.
     * Spelling the cross join out fixes the precedence.
     */
    select count(*) into v_satisfied
    from public.lessons l
    cross join lateral jsonb_array_elements(l.blocks) as b
    join public.learner_block_responses r
      on r.block_id = b ->> 'id'
     and r.lesson_id = l.id
     and r.profile_id = v_uid
    where l.id = p_lesson_id
      and b ->> 'kind' = v_rule::text
      and length(btrim(coalesce(r.response ->> 'value', ''))) > 0;

    if v_satisfied = 0 then
      raise exception '% not recorded', v_rule using errcode = 'check_violation';
    end if;

  elsif v_rule = 'practical' then
    raise exception 'practical completion needs the missions system'
      using errcode = 'feature_not_supported';
  end if;

  insert into public.learner_lesson_progress
    (profile_id, lesson_id, status, completed_at)
  values (v_uid, p_lesson_id, 'completed', now())
  on conflict (profile_id, lesson_id) do update
    set status = 'completed',
        completed_at = coalesce(public.learner_lesson_progress.completed_at, now())
  returning * into v_row;

  return v_row;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────────────────────

-- Content is read-only to every client. It is authored with SQL, by the owner.
revoke all on public.phases, public.modules, public.lessons,
  public.lesson_prerequisites, public.lesson_resources from anon, authenticated;
grant select on public.phases, public.modules, public.lessons,
  public.lesson_prerequisites, public.lesson_resources to authenticated;

-- Learner state. Note what is absent: no update on `status`, `is_correct`,
-- `completed_at` or `attempts`. Those belong to the two functions above.
revoke all on public.learner_lesson_progress, public.learner_block_responses,
  public.learner_lesson_notes from anon, authenticated;

grant select on public.learner_lesson_progress to authenticated;
grant insert (profile_id, lesson_id) on public.learner_lesson_progress to authenticated;
grant update (last_block_id, confidence) on public.learner_lesson_progress to authenticated;

-- Read only. Every write goes through `record_block_response`.
grant select on public.learner_block_responses to authenticated;

grant select, delete on public.learner_lesson_notes to authenticated;
grant insert (profile_id, lesson_id, body) on public.learner_lesson_notes to authenticated;
grant update (body) on public.learner_lesson_notes to authenticated;

revoke execute on function public.record_block_response(uuid, text, jsonb) from public;
revoke execute on function public.complete_lesson(uuid) from public;
revoke execute on function public.lesson_blocks_have_ids(jsonb) from public;
grant execute on function public.record_block_response(uuid, text, jsonb) to authenticated;
grant execute on function public.complete_lesson(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.phases enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_prerequisites enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.learner_lesson_progress enable row level security;
alter table public.learner_block_responses enable row level security;
alter table public.learner_lesson_notes enable row level security;

-- Published content is readable by any signed-in account; staff see drafts too.
create policy "published phases are readable" on public.phases
  for select to authenticated using (published or public.is_staff());

create policy "published modules are readable" on public.modules
  for select to authenticated using (published or public.is_staff());

create policy "published lessons are readable" on public.lessons
  for select to authenticated using (published or public.is_staff());

create policy "prerequisites follow their lesson" on public.lesson_prerequisites
  for select to authenticated using (
    exists (select 1 from public.lessons l
            where l.id = lesson_id and (l.published or public.is_staff()))
  );

create policy "resources follow their lesson" on public.lesson_resources
  for select to authenticated using (
    exists (select 1 from public.lessons l
            where l.id = lesson_id and (l.published or public.is_staff()))
  );

-- Learner state: your own rows, and staff may read them because reviewing
-- somebody's work means seeing what they did.
create policy "progress is yours, and readable by staff" on public.learner_lesson_progress
  for select to authenticated using ((select auth.uid()) = profile_id or public.is_staff());
create policy "you start your own progress" on public.learner_lesson_progress
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you update your own progress" on public.learner_lesson_progress
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "responses are yours, and readable by staff" on public.learner_block_responses
  for select to authenticated using ((select auth.uid()) = profile_id or public.is_staff());

create policy "notes are yours alone" on public.learner_lesson_notes
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "you write your own notes" on public.learner_lesson_notes
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you edit your own notes" on public.learner_lesson_notes
  for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
create policy "you delete your own notes" on public.learner_lesson_notes
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- Notes are private even from staff. A note is thinking-out-loud, not
-- submitted work; a learner who knows a mentor reads it writes a different
-- note. Submissions are Prompt 4 and are explicitly shared.
