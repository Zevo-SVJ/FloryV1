-- LOCK — the Toolbox
--
-- Prompts, frameworks, templates, checklists, resources and stack notes, in one
-- table.
--
-- Six tables was the obvious alternative and it is the wrong shape here. The
-- six share almost every column — title, slug, summary, phase, tags, published
-- — and differ only in a body that is prose either way. Worse, three features
-- this prompt asks for cut across all of them: a unified search, saved items,
-- and links from lessons and missions. With six tables each of those becomes
-- six joins or a union; with one table each is a single index, a single foreign
-- key, a single join table. Adding a seventh kind later is an enum value.
--
-- The cost is that the body is JSONB. That cost is paid the way Prompt 3 paid
-- it for lesson blocks: `src/lib/toolbox/schemas.ts` parses every item through
-- Zod on the way out, so a malformed body is a caught error at one boundary
-- rather than an exception inside a renderer. The database enforces only what
-- it must — that the body is an object, and that a checklist's items carry the
-- stable ids a learner's tick state is keyed on.
--
-- Ownership, stated once: **the Toolbox is platform content and the Workspace
-- is learner work.** Nothing in this migration grants a client a single write
-- to `toolbox_items`. The three learner tables at the bottom are theirs alone.

create type public.toolbox_kind as enum (
  'prompt', 'framework', 'template', 'checklist', 'resource', 'stack_tool'
);

create table public.toolbox_items (
  id uuid primary key default extensions.gen_random_uuid(),
  kind public.toolbox_kind not null,
  slug text not null unique,
  title text not null,
  /* One line answering "what is this?". Shown in search results and in the
     contextual toolbox, so it has to stand alone. */
  summary text not null,
  /* Which phase it belongs to, or null for the tools used throughout. */
  phase_key text references public.phases (key) on delete set null,
  tags text[] not null default '{}',
  body jsonb not null default '{}'::jsonb,
  position smallint not null default 0,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint toolbox_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint toolbox_body_is_object check (jsonb_typeof(body) = 'object'),
  constraint toolbox_summary_said check (length(btrim(summary)) between 10 and 400)
);

create index toolbox_kind_idx on public.toolbox_items (kind, position);
create index toolbox_phase_idx on public.toolbox_items (phase_key);
create index toolbox_tags_idx on public.toolbox_items using gin (tags);

/*
 * Search, as a generated column.
 *
 * Generated rather than maintained by a trigger, so it cannot fall out of step
 * with the row — the two ways this normally breaks are a trigger somebody
 * forgets to add to a new table and a backfill somebody forgets to run.
 *
 * Weighted: a title match should beat a body match, because somebody typing
 * "validation" wants the framework called Problem Validation before they want
 * the prompt that mentions validation in its third paragraph.
 *
 * `coalesce` on every part. `to_tsvector` of null is null, and one null column
 * would silently empty the whole vector for that row.
 *
 * `'english'::regconfig`, not `'english'`. A bare literal is `text`, which
 * resolves to the overload reading `default_text_search_config` — a session
 * setting, so that one is only *stable* and Postgres refuses it in a generated
 * column. The cast picks the immutable overload.
 *
 * Tags are deliberately not in the vector. `array_to_string` is `stable` too,
 * for the same class of reason, and the honest options were a wrapper function
 * declared immutable — a lie the planner would believe — or leaving them out.
 * They are left out: tags have their own GIN index and their job is filtering,
 * which is a better use for them than diluting a relevance ranking.
 */
alter table public.toolbox_items add column search tsvector
  generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(body::text, '')), 'C')
  ) stored;

create index toolbox_search_idx on public.toolbox_items using gin (search);

-- A checklist's items must carry stable ids, because a learner's ticks are
-- keyed on them. Same rule, same reason, as lesson blocks.
create or replace function public.toolbox_checklist_items_identified(kind public.toolbox_kind, body jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when kind <> 'checklist' then true
    else coalesce(
      (
        select bool_and(
          coalesce(jsonb_typeof(item -> 'id') = 'string', false)
          and coalesce(length(item ->> 'id') between 1 and 80, false)
        )
        from jsonb_array_elements(coalesce(body -> 'groups', '[]'::jsonb)) as grp,
             jsonb_array_elements(coalesce(grp -> 'items', '[]'::jsonb)) as item
      ),
      true
    )
  end;
$$;

alter table public.toolbox_items
  add constraint toolbox_checklist_items_identified
  check (public.toolbox_checklist_items_identified(kind, body));

-- ────────────────────────────────────────────────────────────────────────────
-- Relationships
-- ────────────────────────────────────────────────────────────────────────────

/*
 * "Tools for this step".
 *
 * The reason these tables exist rather than a tag convention: a learner should
 * never have to work out which item from a growing library applies to the
 * mission in front of them. The curriculum states it, and the mission page
 * shows it.
 */
create table public.lesson_toolbox_items (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  item_id uuid not null references public.toolbox_items (id) on delete cascade,
  position smallint not null default 0,
  primary key (lesson_id, item_id)
);

create table public.mission_toolbox_items (
  mission_id uuid not null references public.missions (id) on delete cascade,
  item_id uuid not null references public.toolbox_items (id) on delete cascade,
  position smallint not null default 0,
  primary key (mission_id, item_id)
);

create index lesson_toolbox_item_idx on public.lesson_toolbox_items (item_id);
create index mission_toolbox_item_idx on public.mission_toolbox_items (item_id);

-- A prompt that belongs with a framework; a template that belongs with a
-- checklist. Directional, so "related to" can be curated rather than symmetric
-- by accident.
create table public.toolbox_item_links (
  item_id uuid not null references public.toolbox_items (id) on delete cascade,
  related_item_id uuid not null references public.toolbox_items (id) on delete cascade,
  primary key (item_id, related_item_id),
  constraint toolbox_link_not_self check (item_id <> related_item_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- What the learner adds
-- ────────────────────────────────────────────────────────────────────────────

create table public.learner_saved_items (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.toolbox_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

/*
 * Recently used.
 *
 * One row per learner per item, with the time replaced on each view rather than
 * a row appended. A history table would grow without limit for a feature whose
 * entire job is showing six things.
 */
create table public.learner_recent_items (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.toolbox_items (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

create index learner_recent_idx on public.learner_recent_items (profile_id, viewed_at desc);

/*
 * Checklist ticks.
 *
 * An array of the ids that are checked, not a row per item. A checklist is read
 * and written whole, the ids come from the item's own body, and an unchecked
 * box is the absence of an id rather than a row that has to be created before
 * it can be unchecked.
 *
 * Worth stating plainly, because the interface must not imply otherwise: a
 * completed checklist is not evidence. It is a safety tool. Evidence is the
 * artifact and the links attached to it, and that lives in the workspace.
 */
create table public.learner_checklist_progress (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.toolbox_items (id) on delete cascade,
  checked_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

create trigger toolbox_touch before update on public.toolbox_items
  for each row execute function public.touch_updated_at();
create trigger checklist_progress_touch before update on public.learner_checklist_progress
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────────────────────

-- Platform content. Read-only to every client, at every role.
revoke all on public.toolbox_items, public.lesson_toolbox_items,
  public.mission_toolbox_items, public.toolbox_item_links from anon, authenticated;
grant select on public.toolbox_items, public.lesson_toolbox_items,
  public.mission_toolbox_items, public.toolbox_item_links to authenticated;

-- Learner data. Theirs to write, and nobody else's to read.
revoke all on public.learner_saved_items, public.learner_recent_items,
  public.learner_checklist_progress from anon, authenticated;

grant select, insert, delete on public.learner_saved_items to authenticated;
grant select, insert, delete on public.learner_recent_items to authenticated;
grant update (viewed_at) on public.learner_recent_items to authenticated;
grant select, insert, delete on public.learner_checklist_progress to authenticated;
grant update (checked_ids) on public.learner_checklist_progress to authenticated;

revoke execute on function public.toolbox_checklist_items_identified(public.toolbox_kind, jsonb) from public;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.toolbox_items enable row level security;
alter table public.lesson_toolbox_items enable row level security;
alter table public.mission_toolbox_items enable row level security;
alter table public.toolbox_item_links enable row level security;
alter table public.learner_saved_items enable row level security;
alter table public.learner_recent_items enable row level security;
alter table public.learner_checklist_progress enable row level security;

create policy "published toolbox items are readable" on public.toolbox_items
  for select to authenticated using (published or public.is_staff());

create policy "lesson tool links follow their item" on public.lesson_toolbox_items
  for select to authenticated using (
    exists (select 1 from public.toolbox_items t
            where t.id = item_id and (t.published or public.is_staff()))
  );
create policy "mission tool links follow their item" on public.mission_toolbox_items
  for select to authenticated using (
    exists (select 1 from public.toolbox_items t
            where t.id = item_id and (t.published or public.is_staff()))
  );
create policy "item links follow their item" on public.toolbox_item_links
  for select to authenticated using (
    exists (select 1 from public.toolbox_items t
            where t.id = related_item_id and (t.published or public.is_staff()))
  );

/*
 * Saved items, recents and checklist ticks are private — not readable by staff.
 *
 * This is a deliberate difference from progress and artifacts, which staff do
 * read. What somebody bookmarked and which boxes they ticked is working
 * behaviour, not submitted work, and a mentor reading it would change it. The
 * same argument as lesson notes in Prompt 3.
 */
create policy "your saved items" on public.learner_saved_items
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "you save your own items" on public.learner_saved_items
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you unsave your own items" on public.learner_saved_items
  for delete to authenticated using ((select auth.uid()) = profile_id);

create policy "your recent items" on public.learner_recent_items
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "you record your own views" on public.learner_recent_items
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you update your own views" on public.learner_recent_items
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "you clear your own views" on public.learner_recent_items
  for delete to authenticated using ((select auth.uid()) = profile_id);

create policy "your checklist state" on public.learner_checklist_progress
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "you start your own checklist state" on public.learner_checklist_progress
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "you tick your own boxes" on public.learner_checklist_progress
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy "you reset your own checklist" on public.learner_checklist_progress
  for delete to authenticated using ((select auth.uid()) = profile_id);
