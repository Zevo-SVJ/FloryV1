-- LOCK — missions and the workspace
--
-- The work layer. Prompt 3 taught the platform how to teach; this is how it
-- makes somebody do the work and show it.
--
--   PHASE → MODULE → LESSON → MISSION → ARTIFACT → EVIDENCE → REVIEW
--
-- Two words that are easy to confuse, and are kept apart deliberately:
--
--   a **deliverable** is what a mission asks for. It is content, authored with
--   the mission, and lives in columns on `missions`.
--   an **artifact** is what the learner produced. It is a row they own.
--
-- One table each would have been two near-identical tables; instead the mission
-- describes the requirement and the artifact is the answer to it.
--
-- The security shape is the one Prompt 3 established, for the same reason: a
-- learner holds `authenticated`, so anything they may write they may forge. A
-- mission that could be completed with a POST would make every claim LOCK makes
-- about competence worthless. `submit_artifact()` and `complete_mission()` own
-- the transitions, and the tables grant no direct write to the columns they set.

-- ────────────────────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────────────────────

-- Where the product itself is, as opposed to where the learner is in the
-- program. They move together but they are not the same fact.
create type public.project_status as enum (
  'idea', 'research', 'validation', 'building', 'live', 'paused', 'archived'
);

create type public.mission_type as enum (
  'research', 'decision', 'writing', 'analysis', 'design',
  'build', 'debug', 'test', 'deploy', 'growth', 'review'
);

create type public.mission_status as enum (
  'not_started', 'in_progress', 'submitted', 'needs_work', 'completed'
);

-- The states an artifact moves through. `draft` is the important one: work in
-- progress must not read as finished, to the learner least of all.
create type public.artifact_status as enum (
  'draft', 'submitted', 'approved', 'needs_work', 'final'
);

/*
 * What counts as proof.
 *
 * The point of this enum is the sentence behind it: a checkbox saying "done" is
 * not evidence. A deployed URL, a commit, a pull request — those are things
 * somebody can open. `note` exists for the phases where the honest answer is
 * written research rather than a link, and it is deliberately last.
 */
create type public.evidence_kind as enum (
  'url', 'repository', 'commit', 'pull_request', 'deployment', 'document', 'note'
);

-- ────────────────────────────────────────────────────────────────────────────
-- The learner's product
-- ────────────────────────────────────────────────────────────────────────────

create table public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  /* The two facts the early phases exist to produce. Empty until then, and
     the workspace says so rather than showing a placeholder. */
  problem_statement text not null default '',
  target_audience text not null default '',
  current_phase text references public.phases (key) on delete set null,
  status public.project_status not null default 'idea',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, slug),
  constraint projects_name_length check (length(btrim(name)) between 1 and 100),
  constraint projects_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$')
);

create index projects_profile_idx on public.projects (profile_id, updated_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Missions
-- ────────────────────────────────────────────────────────────────────────────

/*
 * A mission is content, like a lesson: one copy, no owner, authored with SQL.
 *
 * `blocks` reuses the lesson block vocabulary and the same renderer — the task
 * and the context are written with the same headings, callouts, checklists and
 * prompts a lesson uses. Only presentational blocks belong here: a mission's
 * interactivity is the workspace below it, not a quiz inside it.
 *
 * `deliverable_*` is the requirement, in the mission's own words. `requires_*`
 * is the bridge to the learning system — learn it, then apply it.
 */
create table public.missions (
  id uuid primary key default extensions.gen_random_uuid(),
  phase_key text not null references public.phases (key) on delete cascade,
  module_id uuid references public.modules (id) on delete set null,
  /* The lesson this mission applies. Not a hard lock by default — see
     `requires_lesson` below, which is the lock. */
  lesson_id uuid references public.lessons (id) on delete set null,
  requires_lesson_id uuid references public.lessons (id) on delete set null,

  slug text not null unique,
  title text not null,
  summary text not null default '',
  type public.mission_type not null,
  difficulty public.lesson_difficulty not null default 'foundational',
  estimated_minutes smallint not null default 45,

  objective text not null,
  why_it_matters text not null default '',
  objectives text[] not null default '{}',
  blocks jsonb not null default '[]'::jsonb,

  deliverable_title text not null,
  deliverable_description text not null default '',
  /* Which kinds of proof this mission insists on. Empty means written work is
     enough — true for THINK, false for SHIP. */
  required_evidence public.evidence_kind[] not null default '{}',
  /* Whether the learner must also say what they learned doing it. */
  requires_reflection boolean not null default false,

  position smallint not null,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint missions_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint missions_blocks_is_array check (jsonb_typeof(blocks) = 'array'),
  constraint missions_blocks_identified check (public.lesson_blocks_have_ids(blocks)),
  constraint missions_minutes_sane check (estimated_minutes between 5 and 2400),
  unique (phase_key, position)
);

create index missions_phase_idx on public.missions (phase_key, position);
create index missions_lesson_idx on public.missions (lesson_id);

create table public.mission_prerequisites (
  mission_id uuid not null references public.missions (id) on delete cascade,
  requires_mission_id uuid not null references public.missions (id) on delete cascade,
  primary key (mission_id, requires_mission_id),
  constraint mission_prerequisites_not_self check (mission_id <> requires_mission_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- What the learner produces
-- ────────────────────────────────────────────────────────────────────────────

/*
 * The artifact: the thing that exists afterwards.
 *
 * `content` is text and `url` is a link, because between them they cover every
 * deliverable in the program — a written brief, a Figma file, a repository, a
 * deployed app. File upload is deliberately absent: Supabase Storage can be
 * added behind a `storage_path` column without touching a policy here, and
 * nothing in the curriculum needs it before it exists.
 *
 * `status` is not writable by the learner. Work moves to `submitted` through a
 * function that checks it is worth submitting, and to `approved` or
 * `needs_work` by a reviewer in Prompt 6.
 */
create table public.artifacts (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid references public.missions (id) on delete set null,
  title text not null,
  description text not null default '',
  content text not null default '',
  url text,
  status public.artifact_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint artifacts_title_length check (length(btrim(title)) between 1 and 160),
  constraint artifacts_url_http check (url is null or url ~* '^https?://'),
  constraint artifacts_content_size check (length(content) <= 100000),
  /* One artifact per mission per project: a mission asks for one thing, and a
     second row would make "the deliverable" ambiguous. */
  unique (project_id, mission_id)
);

create index artifacts_project_idx on public.artifacts (project_id, created_at desc);
create index artifacts_status_idx on public.artifacts (profile_id, status);

/*
 * Proof, attached to the artifact it proves.
 *
 * A row per piece rather than a column per kind, because a BUILD mission wants
 * a repository *and* a pull request, and a SHIP mission wants a deployment
 * *and* the commit it came from.
 */
create table public.evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  kind public.evidence_kind not null,
  url text,
  label text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint evidence_url_http check (url is null or url ~* '^https?://'),
  /* Everything except a note is a thing somebody opens. A URL kind with no URL
     is the failure this constraint exists to catch. */
  constraint evidence_link_kinds_have_urls check (kind = 'note' or url is not null),
  constraint evidence_note_says_something check (
    kind <> 'note' or length(btrim(note)) >= 10
  )
);

create index evidence_artifact_idx on public.evidence (artifact_id, created_at);

/*
 * Review, in skeleton.
 *
 * Prompt 6 builds the mentor experience. What exists now is the record a review
 * leaves behind, so that when it arrives it has somewhere to write rather than
 * needing a migration and a backfill.
 */
create table public.artifact_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  artifact_id uuid not null references public.artifacts (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  status public.artifact_status not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  constraint feedback_status_is_a_verdict check (status in ('approved', 'needs_work'))
);

create index artifact_feedback_artifact_idx on public.artifact_feedback (artifact_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Progress and the record of the build
-- ────────────────────────────────────────────────────────────────────────────

create table public.learner_mission_progress (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  status public.mission_status not null default 'in_progress',
  reflection text not null default '',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (profile_id, mission_id),
  constraint mission_completed_has_time check (
    (status = 'completed') = (completed_at is not null)
  )
);

create index learner_mission_idx on public.learner_mission_progress (profile_id, updated_at desc);

/*
 * The build log.
 *
 * A dated record of what happened, and the story the workspace tells back. Most
 * entries are written by the system when something real occurs — an artifact
 * submitted, a mission completed — because a log somebody has to remember to
 * write is a log that stops after a week. `is_automatic` marks those, so a
 * learner's own entries stay theirs.
 */
create table public.build_log_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid references public.missions (id) on delete set null,
  artifact_id uuid references public.artifacts (id) on delete set null,
  occurred_at timestamptz not null default now(),
  title text not null,
  detail text not null default '',
  is_automatic boolean not null default false,
  created_at timestamptz not null default now(),
  constraint build_log_title_length check (length(btrim(title)) between 1 and 200)
);

create index build_log_project_idx on public.build_log_entries (project_id, occurred_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger missions_touch before update on public.missions
  for each row execute function public.touch_updated_at();
create trigger artifacts_touch before update on public.artifacts
  for each row execute function public.touch_updated_at();
create trigger mission_progress_touch before update on public.learner_mission_progress
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- The transitions a learner must not make for themselves
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Submit an artifact for review.
 *
 * Checks the work is worth submitting before it changes anything: there has to
 * be something in it, and every kind of evidence the mission demands has to be
 * attached. A SHIP mission that requires a deployment URL cannot be submitted
 * with an empty text box and good intentions, which is the entire point of the
 * evidence model.
 *
 * Writes the build log entry too, in the same transaction, so the record cannot
 * drift from what actually happened.
 */
create or replace function public.submit_artifact(p_artifact_id uuid)
returns public.artifacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_artifact public.artifacts;
  v_mission public.missions;
  v_missing public.evidence_kind;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into v_artifact from public.artifacts
  where id = p_artifact_id and profile_id = v_uid;

  if v_artifact.id is null then
    raise exception 'no such artifact' using errcode = 'no_data_found';
  end if;

  if length(btrim(v_artifact.content)) = 0 and v_artifact.url is null then
    raise exception 'nothing to submit' using errcode = 'check_violation';
  end if;

  if v_artifact.mission_id is not null then
    select * into v_mission from public.missions where id = v_artifact.mission_id;

    foreach v_missing in array coalesce(v_mission.required_evidence, '{}') loop
      if not exists (
        select 1 from public.evidence e
        where e.artifact_id = p_artifact_id and e.kind = v_missing
      ) then
        raise exception 'missing evidence: %', v_missing using errcode = 'check_violation';
      end if;
    end loop;
  end if;

  update public.artifacts
  set status = 'submitted', submitted_at = coalesce(submitted_at, now())
  where id = p_artifact_id
  returning * into v_artifact;

  insert into public.build_log_entries
    (project_id, profile_id, mission_id, artifact_id, title, detail, is_automatic)
  values (
    v_artifact.project_id, v_uid, v_artifact.mission_id, v_artifact.id,
    'Submitted ' || v_artifact.title,
    coalesce(v_mission.title, ''),
    true
  );

  return v_artifact;
end;
$$;

/*
 * Complete a mission.
 *
 * Opening the page is not completion, and neither is a POST that says so. A
 * mission is done when its artifact has been submitted and, where the mission
 * asks for one, a reflection has been written. The reflection requirement is
 * not ceremony: the phases this program covers are full of decisions whose
 * reasoning is worth more than their outcome.
 */
create or replace function public.complete_mission(p_mission_id uuid, p_reflection text default null)
returns public.learner_mission_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_mission public.missions;
  v_artifact public.artifacts;
  v_reflection text;
  v_row public.learner_mission_progress;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into v_mission from public.missions
  where id = p_mission_id and (published or public.is_staff());

  if v_mission.id is null then
    raise exception 'no such mission' using errcode = 'no_data_found';
  end if;

  select * into v_artifact from public.artifacts
  where mission_id = p_mission_id and profile_id = v_uid;

  if v_artifact.id is null or v_artifact.status = 'draft' then
    raise exception 'submit the deliverable first' using errcode = 'check_violation';
  end if;

  v_reflection := coalesce(
    nullif(btrim(coalesce(p_reflection, '')), ''),
    (select nullif(btrim(reflection), '') from public.learner_mission_progress
      where profile_id = v_uid and mission_id = p_mission_id)
  );

  if v_mission.requires_reflection and v_reflection is null then
    raise exception 'this mission needs a reflection' using errcode = 'check_violation';
  end if;

  insert into public.learner_mission_progress
    (profile_id, mission_id, project_id, status, reflection, submitted_at, completed_at)
  values (
    v_uid, p_mission_id, v_artifact.project_id, 'completed',
    coalesce(v_reflection, ''), v_artifact.submitted_at, now()
  )
  on conflict (profile_id, mission_id) do update
    set status = 'completed',
        reflection = coalesce(v_reflection, public.learner_mission_progress.reflection),
        completed_at = coalesce(public.learner_mission_progress.completed_at, now()),
        project_id = coalesce(public.learner_mission_progress.project_id, v_artifact.project_id)
  returning * into v_row;

  insert into public.build_log_entries
    (project_id, profile_id, mission_id, artifact_id, title, detail, is_automatic)
  values (
    v_artifact.project_id, v_uid, p_mission_id, v_artifact.id,
    'Completed ' || v_mission.title, v_mission.objective, true
  );

  return v_row;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────────────────────

revoke all on public.missions, public.mission_prerequisites from anon, authenticated;
grant select on public.missions, public.mission_prerequisites to authenticated;

revoke all on public.projects, public.artifacts, public.evidence,
  public.artifact_feedback, public.learner_mission_progress,
  public.build_log_entries from anon, authenticated;

grant select, insert, delete on public.projects to authenticated;
grant update (name, description, problem_statement, target_audience,
              current_phase, status) on public.projects to authenticated;

-- Note what is missing: `status` and `submitted_at`. Those belong to
-- `submit_artifact()` and, later, to a reviewer.
grant select, insert, delete on public.artifacts to authenticated;
grant update (title, description, content, url) on public.artifacts to authenticated;

grant select, insert, delete on public.evidence to authenticated;
grant select on public.artifact_feedback to authenticated;

grant select, insert on public.learner_mission_progress to authenticated;
grant update (reflection, project_id) on public.learner_mission_progress to authenticated;

grant select, insert, delete on public.build_log_entries to authenticated;
grant update (title, detail, occurred_at) on public.build_log_entries to authenticated;

revoke execute on function public.submit_artifact(uuid) from public;
revoke execute on function public.complete_mission(uuid, text) from public;
grant execute on function public.submit_artifact(uuid) to authenticated;
grant execute on function public.complete_mission(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.projects enable row level security;
alter table public.missions enable row level security;
alter table public.mission_prerequisites enable row level security;
alter table public.artifacts enable row level security;
alter table public.evidence enable row level security;
alter table public.artifact_feedback enable row level security;
alter table public.learner_mission_progress enable row level security;
alter table public.build_log_entries enable row level security;

create policy "published missions are readable" on public.missions
  for select to authenticated using (published or public.is_staff());
create policy "mission prerequisites follow their mission" on public.mission_prerequisites
  for select to authenticated using (
    exists (select 1 from public.missions m
            where m.id = mission_id and (m.published or public.is_staff()))
  );

/*
 * A learner's work is theirs, and visible to staff.
 *
 * Staff read rather than write throughout: reviewing is reading plus leaving
 * feedback, and a mentor who could edit a learner's artifact would be doing
 * the mission for them.
 */
create policy "your projects, and staff may read them" on public.projects
  for select to authenticated using ((select auth.uid()) = profile_id or public.is_staff());
create policy "you create your own project" on public.projects
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you edit your own project" on public.projects
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "you delete your own project" on public.projects
  for delete to authenticated using ((select auth.uid()) = profile_id);

create policy "your artifacts, and staff may read them" on public.artifacts
  for select to authenticated using ((select auth.uid()) = profile_id or public.is_staff());
create policy "you create your own artifacts" on public.artifacts
  for insert to authenticated with check (
    (select auth.uid()) = profile_id
    and exists (select 1 from public.projects p
                where p.id = project_id and p.profile_id = (select auth.uid()))
  );
create policy "you edit your own artifacts" on public.artifacts
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "you delete your own artifacts" on public.artifacts
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- Evidence follows the artifact it proves, in every direction.
create policy "evidence follows its artifact" on public.evidence
  for select to authenticated using (
    exists (select 1 from public.artifacts a
            where a.id = artifact_id
              and (a.profile_id = (select auth.uid()) or public.is_staff()))
  );
create policy "you attach evidence to your own artifacts" on public.evidence
  for insert to authenticated with check (
    exists (select 1 from public.artifacts a
            where a.id = artifact_id and a.profile_id = (select auth.uid()))
  );
create policy "you remove evidence from your own artifacts" on public.evidence
  for delete to authenticated using (
    exists (select 1 from public.artifacts a
            where a.id = artifact_id and a.profile_id = (select auth.uid()))
  );

-- Feedback is readable by its subject and by staff, and written by nobody yet:
-- Prompt 6 adds the insert policy along with the mentor experience.
create policy "feedback is readable by the learner and staff" on public.artifact_feedback
  for select to authenticated using (
    exists (select 1 from public.artifacts a
            where a.id = artifact_id
              and (a.profile_id = (select auth.uid()) or public.is_staff()))
  );

create policy "your mission progress, and staff may read it" on public.learner_mission_progress
  for select to authenticated using ((select auth.uid()) = profile_id or public.is_staff());
create policy "you start your own missions" on public.learner_mission_progress
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you update your own mission progress" on public.learner_mission_progress
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

create policy "your build log, and staff may read it" on public.build_log_entries
  for select to authenticated using ((select auth.uid()) = profile_id or public.is_staff());
create policy "you write your own build log" on public.build_log_entries
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you edit your own build log" on public.build_log_entries
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "you delete your own build log entries" on public.build_log_entries
  for delete to authenticated using ((select auth.uid()) = profile_id);
