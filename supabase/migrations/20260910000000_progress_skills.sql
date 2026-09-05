-- LOCK — progress, skills, milestones, XP, and the content lifecycle
--
-- The argument this migration makes, before any of its tables:
--
--   Completing a lesson is not evidence of capability. Producing work that a
--   mentor approved is. So progress in LOCK is not one number, it is six
--   questions with six different answers, and the one the learner cares about
--   most — "what can I actually do now?" — is answered from artifacts and
--   reviews rather than from pages opened.
--
-- Nothing here is a second source of truth. Every table below is either a
-- definition somebody authors (skills, milestones, XP rules) or an append-only
-- record of something that already happened elsewhere in the schema (skill
-- evidence, XP events, earned milestones). Every *number* — a skill's state, a
-- learner's XP total, a phase's percentage, a streak — is a view over those
-- records, computed on read. There is no column anywhere holding a progress
-- figure that a later bug could leave stale.
--
-- The one exception is `published`, and it is a deliberate one, explained in
-- the content-lifecycle section below.

-- A milestone is worth telling somebody about. Added at the top of the file so
-- that, if this migration is applied as one transaction, the value is committed
-- to the type long before `evaluate_milestones()` ever writes one at runtime.
alter type public.notification_kind add value if not exists 'milestone_earned';

-- ────────────────────────────────────────────────────────────────────────────
-- Content lifecycle
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Four states, because "published: true/false" cannot say the thing the
 * curriculum most needs to say while it is being written: *this is drafted and
 * waiting to be read by somebody*. The whole LOCK curriculum arrives over
 * later prompts, one phase at a time, and an author needs to move a lesson
 * from `draft` to `review` to `published` without it becoming visible a step
 * early.
 *
 * `archived` is the retirement state. It is not a delete: a learner who
 * completed a lesson keeps that completion, because progress rows key on the
 * lesson's stable id and the row stays. Retiring content never rewrites
 * history — see the versioning note further down.
 */
create type public.content_status as enum ('draft', 'review', 'published', 'archived');

/*
 * `status` is authoritative, and `published` becomes a generated column.
 *
 * Every policy, function and query written across Prompts 3–6 reads
 * `published`, and rewriting them all to say `status = 'published'` would be a
 * dozen chances to widen one by accident, in the exact place where a mistake
 * means unpublished content leaking to a learner. So `published` keeps
 * working and keeps meaning what it meant — it is now computed.
 *
 * A trigger keeping the two in step was the obvious cheaper option and it is
 * wrong in a way worth spelling out: `insert into lessons (..., published)
 * values (..., true)` would still be accepted, the trigger would overwrite the
 * value from a defaulted `status`, and the row would land as a draft while its
 * author believed it was live. A generated column *rejects* that insert
 * instead. Failing loudly at the point of the mistake beats silently doing
 * something else, especially for the column that decides what a learner sees.
 *
 * The cost is that the eleven policies depending on `published` have to be
 * dropped and recreated around the column swap. They are recreated verbatim
 * below, and suites 03, 04 and 05 already assert that drafts stay invisible —
 * so a mistake here fails the build rather than shipping.
 *
 * The new authoring convention, from this migration onward: set `status`.
 */
alter table public.phases
  add column status public.content_status not null default 'published';
alter table public.modules
  add column status public.content_status not null default 'draft';
alter table public.lessons
  add column status public.content_status not null default 'draft';
alter table public.missions
  add column status public.content_status not null default 'draft';
alter table public.toolbox_items
  add column status public.content_status not null default 'draft';

-- Carry over what each row already says, before `published` stops being stored.
update public.phases        set status = (case when published then 'published' else 'draft' end)::public.content_status;
update public.modules       set status = (case when published then 'published' else 'draft' end)::public.content_status;
update public.lessons       set status = (case when published then 'published' else 'draft' end)::public.content_status;
update public.missions      set status = (case when published then 'published' else 'draft' end)::public.content_status;
update public.toolbox_items set status = (case when published then 'published' else 'draft' end)::public.content_status;

-- ── The swap ────────────────────────────────────────────────────────────────

drop policy "published phases are readable" on public.phases;
drop policy "published modules are readable" on public.modules;
drop policy "published lessons are readable" on public.lessons;
drop policy "published missions are readable" on public.missions;
drop policy "published toolbox items are readable" on public.toolbox_items;
drop policy "prerequisites follow their lesson" on public.lesson_prerequisites;
drop policy "resources follow their lesson" on public.lesson_resources;
drop policy "mission prerequisites follow their mission" on public.mission_prerequisites;
drop policy "lesson tool links follow their item" on public.lesson_toolbox_items;
drop policy "mission tool links follow their item" on public.mission_toolbox_items;
drop policy "item links follow their item" on public.toolbox_item_links;
drop index public.lessons_published_idx;

alter table public.phases        drop column published;
alter table public.modules       drop column published;
alter table public.lessons       drop column published;
alter table public.missions      drop column published;
alter table public.toolbox_items drop column published;

alter table public.phases
  add column published boolean not null generated always as (status = 'published') stored;
alter table public.modules
  add column published boolean not null generated always as (status = 'published') stored;
alter table public.lessons
  add column published boolean not null generated always as (status = 'published') stored;
alter table public.missions
  add column published boolean not null generated always as (status = 'published') stored;
alter table public.toolbox_items
  add column published boolean not null generated always as (status = 'published') stored;

create index lessons_published_idx on public.lessons (published) where published;

-- Recreated exactly as they were. The expressions are unchanged; only the
-- column underneath them is now computed rather than stored.
create policy "published phases are readable" on public.phases
  for select to authenticated using (published or public.is_staff());

create policy "published modules are readable" on public.modules
  for select to authenticated using (published or public.is_staff());

create policy "published lessons are readable" on public.lessons
  for select to authenticated using (published or public.is_staff());

create policy "published missions are readable" on public.missions
  for select to authenticated using (published or public.is_staff());

create policy "published toolbox items are readable" on public.toolbox_items
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

create policy "mission prerequisites follow their mission" on public.mission_prerequisites
  for select to authenticated using (
    exists (select 1 from public.missions m
            where m.id = mission_id and (m.published or public.is_staff()))
  );

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

comment on column public.lessons.status is
  'Editorial lifecycle, and the authoritative one. `published` is generated from it.';

/*
 * Versioning, kept to the smallest thing that works.
 *
 * `content_version` is an integer an author bumps when a lesson changes
 * materially, and `published_at` records when it first became visible. Neither
 * is used to fork content: progress rows point at the lesson's stable `id`,
 * which never changes, so editing a lesson can never make somebody's
 * completion vanish. What these two columns buy is the ability to *say* that
 * the lesson somebody completed is not the lesson on screen today — which is
 * the honest limit of what a training platform needs before it needs a CMS.
 */
alter table public.lessons
  add column content_version integer not null default 1,
  add column published_at timestamptz;
alter table public.missions
  add column content_version integer not null default 1,
  add column published_at timestamptz;

alter table public.lessons add constraint lessons_version_positive check (content_version >= 1);
alter table public.missions add constraint missions_version_positive check (content_version >= 1);

update public.lessons  set published_at = created_at where published;
update public.missions set published_at = created_at where published;

create or replace function public.stamp_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger lessons_stamp_published before insert or update on public.lessons
  for each row execute function public.stamp_published_at();
create trigger missions_stamp_published before insert or update on public.missions
  for each row execute function public.stamp_published_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Skills
-- ────────────────────────────────────────────────────────────────────────────

-- Six areas, matching how a founder's work actually divides. Grouping exists
-- so the skills page reads as a person's capability rather than as a list of
-- twenty-one rows.
create type public.skill_area as enum (
  'thinking', 'product', 'design', 'build', 'ship', 'business'
);

/*
 * Five states, and the ordering between them is the whole point.
 *
 *   not_started   — no evidence at all.
 *   introduced    — the learner has been taught it. Nothing more is claimed.
 *   practicing    — they have applied it in a mission they completed.
 *   demonstrated  — they produced work using it that a mentor approved.
 *   strong        — they have done that more than once.
 *
 * Note where the line falls. Finishing every lesson about validation gets you
 * to `introduced` and no further, because reading about validation is not
 * evidence that you can validate anything. Only a mission moves you to
 * `practicing`, and only somebody else's approval moves you past it. That is
 * the brief's "completion ≠ mastery", expressed as a state machine instead of
 * as a sentence in a README.
 */
create type public.skill_state as enum (
  'not_started', 'introduced', 'practicing', 'demonstrated', 'strong'
);

-- What produced a piece of evidence. Each kind maps to the highest state it
-- can justify — see `learner_skill_states` below, which is the only place that
-- mapping is written.
create type public.skill_evidence_kind as enum (
  'lesson_completed', 'mission_completed', 'artifact_approved'
);

create table public.skills (
  key text primary key,
  area public.skill_area not null,
  label text not null,
  summary text not null default '',
  /* What the learner is claiming when this reaches `demonstrated`. Written in
     the second person, because the skills page shows it to them. */
  demonstrates text not null default '',
  position smallint not null,
  status public.content_status not null default 'published',
  published boolean not null generated always as (status = 'published') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_key_shape check (key ~ '^[a-z][a-z0-9_-]{1,40}$'),
  unique (area, position)
);

create trigger skills_touch before update on public.skills
  for each row execute function public.touch_updated_at();

comment on table public.skills is
  'Founder capabilities. Definitions only — a learner''s state is derived from evidence.';

-- ── The relationships that make content teach a skill ────────────────────────

/*
 * A lesson introduces skills; a mission practises them.
 *
 * Two join tables rather than one polymorphic one, because a foreign key that
 * points at two tables is not a foreign key. Both cascade, so retiring a
 * lesson does not leave a link to nothing — and note that the *evidence* a
 * learner earned through it does not cascade, because that already happened.
 */
create table public.lesson_skills (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  skill_key text not null references public.skills (key) on delete cascade,
  primary key (lesson_id, skill_key)
);

create table public.mission_skills (
  mission_id uuid not null references public.missions (id) on delete cascade,
  skill_key text not null references public.skills (key) on delete cascade,
  /* A mission usually practises several skills but is *about* one. The primary
     one is what the mission card names and what an approval counts hardest
     towards. */
  is_primary boolean not null default false,
  primary key (mission_id, skill_key)
);

create index lesson_skills_skill_idx on public.lesson_skills (skill_key);
create index mission_skills_skill_idx on public.mission_skills (skill_key);

/*
 * The record of a learner having shown something.
 *
 * Append-only and written by trusted functions alone — there is no insert
 * grant for `authenticated` on this table at any privilege level, which is the
 * mechanism behind "a learner cannot change their own skill level". They
 * cannot, because a skill level is not stored anywhere; it is counted from
 * these rows, and these rows are written by `record_skill_evidence()` running
 * as the owner in the same transaction as the event that justified them.
 *
 * The unique constraint is the deduplication: one lesson, one mission, one
 * artifact each justify a given skill exactly once, however many times the
 * event is replayed.
 */
create table public.skill_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_key text not null references public.skills (key) on delete cascade,
  kind public.skill_evidence_kind not null,
  /* What produced it. Exactly one is set; the check below insists. */
  lesson_id uuid references public.lessons (id) on delete set null,
  mission_id uuid references public.missions (id) on delete set null,
  artifact_id uuid references public.artifacts (id) on delete set null,
  /* Frozen at the moment it was earned, so a later edit to a lesson title does
     not rewrite what the evidence list says happened. */
  detail text not null default '',
  occurred_at timestamptz not null default now(),
  constraint skill_evidence_has_one_source check (
    (lesson_id is not null)::int + (mission_id is not null)::int
      + (artifact_id is not null)::int = 1
  ),
  constraint skill_evidence_kind_matches_source check (
    (kind = 'lesson_completed'   and lesson_id   is not null) or
    (kind = 'mission_completed'  and mission_id  is not null) or
    (kind = 'artifact_approved'  and artifact_id is not null)
  )
);

-- One row per learner per skill per source. `coalesce` to a fixed uuid so the
-- two null columns do not defeat the uniqueness the way nulls normally do.
create unique index skill_evidence_once_idx on public.skill_evidence (
  profile_id, skill_key, kind,
  coalesce(lesson_id, mission_id, artifact_id)
);

create index skill_evidence_profile_idx on public.skill_evidence (profile_id, occurred_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- XP
-- ────────────────────────────────────────────────────────────────────────────

/*
 * XP is a secondary signal and the schema says so out loud.
 *
 * There is no `learner_xp.total` column. There is a ledger of events, and a
 * total is `sum(amount)` over it. That is not purity for its own sake — it is
 * what makes XP auditable: every point a learner has can be traced to the
 * lesson, mission or artifact that produced it, and a wrong total is a wrong
 * row rather than a number nobody can explain.
 *
 * Amounts live in `xp_rules`, one row per kind, so the values are edited in
 * one place and never appear in a component.
 */
create type public.xp_event_kind as enum (
  'lesson_completed',
  'mission_completed',
  'artifact_submitted',
  'artifact_approved',
  'reflection_submitted',
  'milestone_earned',
  'project_started'
);

create table public.xp_rules (
  kind public.xp_event_kind primary key,
  amount integer not null,
  label text not null,
  /* Why this is worth what it is worth. Shown on the progress page, because a
     number nobody can justify is a number nobody should trust. */
  rationale text not null default '',
  constraint xp_rules_amount_sane check (amount between 0 and 1000)
);

/*
 * The weighting, and the argument for it in one line each.
 *
 * A mentor-approved artifact is worth six lessons. That ratio is the product's
 * opinion about what learning is, and it belongs in data where it can be seen
 * and changed rather than scattered through the code that awards it.
 */
insert into public.xp_rules (kind, amount, label, rationale) values
  ('lesson_completed',     10, 'Lesson completed',
   'Understanding is the input. It is worth the least because it is the easiest.'),
  ('mission_completed',    40, 'Mission completed',
   'You applied it and produced something.'),
  ('artifact_submitted',   10, 'Work submitted',
   'Putting work up for judgement is a real step, and a small one.'),
  ('artifact_approved',    60, 'Work approved',
   'Somebody else looked at it and said it holds. This is the heaviest event.'),
  ('reflection_submitted', 15, 'Reflection written',
   'Saying what you learned is where a mission becomes a lesson.'),
  ('milestone_earned',     50, 'Milestone reached',
   'A marker on the journey, not a participation award.'),
  ('project_started',      20, 'Project started',
   'Naming what you are building is the first commitment.');

create table public.xp_events (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.xp_event_kind not null,
  amount integer not null,
  /*
   * What caused it: a kind, and a stable text identity within that kind.
   *
   * Text rather than a uuid foreign key for two reasons. The causes span five
   * tables, so no single reference works; and the ledger has to survive any of
   * them being retired — an audit trail that disappears when content is
   * archived is not an audit trail. A lesson's subject_key is its uuid written
   * out; a milestone's is its slug.
   */
  subject_type text not null,
  subject_key text not null,
  detail text not null default '',
  created_at timestamptz not null default now(),
  constraint xp_events_amount_sane check (amount between 0 and 1000),
  constraint xp_events_subject_shape check (subject_type ~ '^[a-z_]{2,40}$'),
  constraint xp_events_subject_key_present check (length(btrim(subject_key)) > 0)
);

/*
 * The rule that stops XP being farmable.
 *
 * One award per learner, per kind, per subject. Completing the same lesson
 * twice, re-submitting the same artifact, replaying the same milestone — all
 * of them collide here and the second insert is dropped. `subject_key` is
 * `not null` precisely so this index works: a nullable column would let
 * duplicates through, because in an index two nulls are not equal.
 */
create unique index xp_events_once_idx
  on public.xp_events (profile_id, kind, subject_type, subject_key);

create index xp_events_profile_idx on public.xp_events (profile_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Milestones and achievements
-- ────────────────────────────────────────────────────────────────────────────

/*
 * One table, two kinds, and that is a decision worth defending.
 *
 * The brief asks for milestones (§8) and achievements (§9) and then lists
 * almost the same things under both — FIRST DEPLOY, FIRST USER, FIRST PAYMENT,
 * SHIPPER appear in each. Building two tables, two requirement engines and two
 * award paths for one concept is exactly the duplicated source of truth §2
 * warns against, and it would mean two places to get the security wrong.
 *
 * So: one definition table, one evaluator, one earned-record table, and a
 * `kind` that decides where a row is *shown*. A milestone is a marker on the
 * journey and appears on the roadmap and the dashboard; an achievement is
 * personal recognition and appears on the achievements page. Same machinery,
 * different surface.
 */
create type public.award_kind as enum ('milestone', 'achievement');

/*
 * How a milestone is earned, as a closed set of deterministic predicates.
 *
 * Every one of these is a counting question against records that already
 * exist — no timers, no heuristics, no "visited the page". Given the same
 * database, the evaluator returns the same answer every time, which is what
 * §8 means by deterministic and what makes these testable.
 *
 *   project_started      — the learner has a project.
 *   lessons_completed    — at least `count` lessons finished.
 *   missions_completed   — at least `count` missions finished, optionally
 *                          restricted to a `phase` or a `mission_type`.
 *   mission_completed    — one specific mission, by `slug`.
 *   artifacts_submitted  — at least `count` artifacts submitted for review.
 *   artifacts_approved   — at least `count` artifacts approved or final.
 *   evidence_submitted   — evidence of `evidence_kind` attached to an artifact
 *                          that reached at least `submitted`.
 *   skill_demonstrated   — a named `skill` reached `demonstrated` or better.
 *   phase_completed      — every published lesson and mission in `phase` done.
 *   manual               — awarded by a mentor. FIRST USER and FIRST PAYMENT
 *                          live here: the database cannot see a customer, and
 *                          inventing a signal for one would be the fake
 *                          functionality the brief forbids.
 */
create type public.milestone_requirement as enum (
  'project_started',
  'lessons_completed',
  'missions_completed',
  'mission_completed',
  'artifacts_submitted',
  'artifacts_approved',
  'evidence_submitted',
  'skill_demonstrated',
  'phase_completed',
  'manual'
);

create table public.milestones (
  key text primary key,
  kind public.award_kind not null default 'milestone',
  title text not null,
  summary text not null,
  /* One or two sentences on what it took. Shown when it is earned. */
  description text not null default '',
  /* A short glyph — an emoji or one or two characters. Not an image asset:
     LOCK's visual language is typographic and a sprite sheet would fight it. */
  icon text not null default '◆',
  requirement public.milestone_requirement not null,
  /* Arguments to the predicate above. Shape depends on `requirement`, and the
     evaluator reads only the keys that requirement names. */
  requirement_config jsonb not null default '{}'::jsonb,
  position smallint not null unique,
  status public.content_status not null default 'published',
  published boolean not null generated always as (status = 'published') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_key_shape check (key ~ '^[a-z][a-z0-9_-]{1,40}$'),
  constraint milestones_config_is_object check (jsonb_typeof(requirement_config) = 'object'),
  constraint milestones_icon_short check (char_length(icon) between 1 and 4)
);

create trigger milestones_touch before update on public.milestones
  for each row execute function public.touch_updated_at();

/*
 * Earned, once, permanently.
 *
 * No update policy and no delete policy at any role: a milestone is a fact
 * about the past. If the requirement is later made harder, the people who
 * already met the old one keep it, which is the same principle as progress
 * surviving a content edit.
 */
create table public.learner_milestones (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  milestone_key text not null references public.milestones (key) on delete cascade,
  earned_at timestamptz not null default now(),
  /* Who or what awarded it. Null for the evaluator; a profile id for a manual
     award, so a mentor-granted milestone is attributable. */
  awarded_by uuid references public.profiles (id) on delete set null,
  note text not null default '',
  primary key (profile_id, milestone_key)
);

create index learner_milestones_profile_idx
  on public.learner_milestones (profile_id, earned_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Derived progress
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Everything from here down is a view, and every one of them is
 * `security_invoker`.
 *
 * That keyword is the security of this whole section in one word: the view
 * runs with the privileges and the policies of whoever selected from it, so a
 * learner selecting `learner_skill_states` sees their own rows because
 * `skill_evidence`'s policy says so — not because the view remembered to add a
 * `where profile_id = auth.uid()`. A view that forgot such a filter would be a
 * silent read of everybody's progress; there is no filter to forget.
 */

/*
 * A skill's state, counted from evidence.
 *
 * The mapping from evidence to state is written once, here, and nowhere else —
 * not in a function, not in TypeScript, not in a component. The thresholds:
 *
 *   ≥2 approvals            → strong
 *   ≥1 approval             → demonstrated
 *   ≥1 mission completed    → practicing
 *   ≥1 lesson completed     → introduced
 *   nothing                 → not_started
 *
 * Read the first two again: only somebody else's approval can push a skill
 * past `practicing`. There is no amount of self-directed activity that reaches
 * `demonstrated`, by construction.
 */
create view public.learner_skill_states
with (security_invoker = true) as
select
  p.id as profile_id,
  s.key as skill_key,
  s.area,
  s.label,
  s.summary,
  s.demonstrates,
  s.position,
  coalesce(count(*) filter (where e.kind = 'lesson_completed'), 0)::int  as lessons_count,
  coalesce(count(*) filter (where e.kind = 'mission_completed'), 0)::int as missions_count,
  coalesce(count(*) filter (where e.kind = 'artifact_approved'), 0)::int as approvals_count,
  max(e.occurred_at) as last_evidence_at,
  case
    when count(*) filter (where e.kind = 'artifact_approved') >= 2 then 'strong'
    when count(*) filter (where e.kind = 'artifact_approved') >= 1 then 'demonstrated'
    when count(*) filter (where e.kind = 'mission_completed')  >= 1 then 'practicing'
    when count(*) filter (where e.kind = 'lesson_completed')   >= 1 then 'introduced'
    else 'not_started'
  end::public.skill_state as state
from public.profiles p
cross join public.skills s
left join public.skill_evidence e
  on e.profile_id = p.id and e.skill_key = s.key
where s.published
group by p.id, s.key, s.area, s.label, s.summary, s.demonstrates, s.position;

comment on view public.learner_skill_states is
  'Every published skill, per learner, with the state its evidence justifies.';

-- The ledger, added up. There is no other definition of a learner's XP.
create view public.learner_xp_totals
with (security_invoker = true) as
select
  profile_id,
  coalesce(sum(amount), 0)::int as total,
  count(*)::int as events,
  max(created_at) as last_earned_at
from public.xp_events
group by profile_id;

/*
 * Module progress: completed published lessons over published lessons.
 *
 * Unpublished lessons are excluded from both sides. A module that is half
 * written must not read as half done — the denominator is what a learner can
 * actually reach today.
 */
create view public.learner_module_progress
with (security_invoker = true) as
select
  pr.id as profile_id,
  m.id as module_id,
  m.phase_key,
  m.title,
  m.position,
  count(l.id)::int as lessons_total,
  count(lp.lesson_id)::int as lessons_done
from public.profiles pr
cross join public.modules m
left join public.lessons l on l.module_id = m.id and l.published
left join public.learner_lesson_progress lp
  on lp.lesson_id = l.id and lp.profile_id = pr.id and lp.status = 'completed'
where m.published
group by pr.id, m.id, m.phase_key, m.title, m.position;

/*
 * Phase progress, weighted — and the weights are the argument.
 *
 * A lesson counts 1. A mission counts 3. That ratio says a phase is mostly
 * about the work rather than the reading, and it is stated here in one place
 * instead of being implied by five different percentages around the interface.
 * Change it here and every surface changes together.
 *
 * `percent` is null when a phase has nothing published. Not zero — zero would
 * claim the learner has done none of ten lessons that do not exist. Null is
 * "there is nothing to be a fraction of", and every surface renders it as
 * "Not published yet".
 */
create view public.learner_phase_progress
with (security_invoker = true) as
with weights as (select 1::int as lesson_weight, 3::int as mission_weight),
lesson_counts as (
  select pr.id as profile_id, m.phase_key,
    count(l.id)::int as total,
    count(lp.lesson_id)::int as done
  from public.profiles pr
  cross join public.modules m
  join public.lessons l on l.module_id = m.id and l.published
  left join public.learner_lesson_progress lp
    on lp.lesson_id = l.id and lp.profile_id = pr.id and lp.status = 'completed'
  where m.published
  group by pr.id, m.phase_key
),
mission_counts as (
  select pr.id as profile_id, ms.phase_key,
    count(ms.id)::int as total,
    count(mp.mission_id)::int as done
  from public.profiles pr
  cross join public.missions ms
  left join public.learner_mission_progress mp
    on mp.mission_id = ms.id and mp.profile_id = pr.id and mp.status = 'completed'
  where ms.published
  group by pr.id, ms.phase_key
)
select
  pr.id as profile_id,
  ph.key as phase_key,
  ph.position,
  ph.label,
  ph.summary,
  coalesce(lc.total, 0) as lessons_total,
  coalesce(lc.done, 0)  as lessons_done,
  coalesce(mc.total, 0) as missions_total,
  coalesce(mc.done, 0)  as missions_done,
  (coalesce(lc.total, 0) * w.lesson_weight
     + coalesce(mc.total, 0) * w.mission_weight) as units_total,
  (coalesce(lc.done, 0) * w.lesson_weight
     + coalesce(mc.done, 0) * w.mission_weight) as units_done,
  case
    when (coalesce(lc.total, 0) * w.lesson_weight
            + coalesce(mc.total, 0) * w.mission_weight) = 0 then null
    else round(
      100.0 * (coalesce(lc.done, 0) * w.lesson_weight
                 + coalesce(mc.done, 0) * w.mission_weight)
      / (coalesce(lc.total, 0) * w.lesson_weight
           + coalesce(mc.total, 0) * w.mission_weight)
    )::int
  end as percent
from public.profiles pr
cross join public.phases ph
cross join weights w
left join lesson_counts  lc on lc.profile_id = pr.id and lc.phase_key = ph.key
left join mission_counts mc on mc.profile_id = pr.id and mc.phase_key = ph.key
where ph.published;

comment on view public.learner_phase_progress is
  'Weighted phase progress. A lesson counts 1, a mission counts 3. '
  'Percent is null when the phase has nothing published.';

-- Global progress is the same weighted units, summed across every phase. One
-- rule, applied twice, so the roadmap and the dashboard cannot disagree.
create view public.learner_overall_progress
with (security_invoker = true) as
select
  profile_id,
  sum(lessons_total)::int  as lessons_total,
  sum(lessons_done)::int   as lessons_done,
  sum(missions_total)::int as missions_total,
  sum(missions_done)::int  as missions_done,
  sum(units_total)::int    as units_total,
  sum(units_done)::int     as units_done,
  count(*) filter (where percent = 100)::int as phases_complete,
  count(*) filter (where units_total > 0)::int as phases_started_or_available,
  case
    when sum(units_total) = 0 then null
    else round(100.0 * sum(units_done) / sum(units_total))::int
  end as percent
from public.learner_phase_progress
group by profile_id;

/*
 * One activity feed, assembled from records that already exist.
 *
 * The build log is already the history of what happened to the product —
 * artifacts submitted, missions completed, reviews returned, all written
 * automatically by the functions that did those things. Adding a second event
 * table beside it would be the duplicate system §21 warns against, so this view
 * reads the build log and adds only what the build log cannot know about:
 * lessons finished (which have no project) and milestones earned.
 */
create view public.learner_activity
with (security_invoker = true) as
select
  b.profile_id,
  'build_log'::text as source,
  b.occurred_at,
  b.title,
  b.detail,
  b.mission_id,
  b.artifact_id,
  null::uuid as lesson_id,
  null::text as milestone_key
from public.build_log_entries b
union all
select
  lp.profile_id,
  'lesson'::text,
  lp.completed_at,
  'Completed ' || l.title,
  l.summary,
  null::uuid,
  null::uuid,
  l.id,
  null::text
from public.learner_lesson_progress lp
join public.lessons l on l.id = lp.lesson_id
where lp.status = 'completed' and lp.completed_at is not null
union all
select
  lm.profile_id,
  'milestone'::text,
  lm.earned_at,
  ms.title,
  ms.summary,
  null::uuid,
  null::uuid,
  null::uuid,
  ms.key
from public.learner_milestones lm
join public.milestones ms on ms.key = lm.milestone_key;

/*
 * A streak, and the smallest one that is honest.
 *
 * Consecutive days ending today or yesterday on which the learner did
 * something real — anything that reached the activity feed above. Yesterday
 * counts as still current because a streak that breaks at midnight is a
 * pressure device, and §11 is explicit that LOCK is not that.
 *
 * There is nothing to punish a missed day: the number goes back to counting
 * from the next day worked, and no surface says anything about it having been
 * higher before.
 */
create view public.learner_streak
with (security_invoker = true) as
with days as (
  select distinct profile_id, (occurred_at at time zone 'UTC')::date as day
  from public.learner_activity
  where occurred_at is not null
),
ranked as (
  select profile_id, day,
    day - (row_number() over (partition by profile_id order by day))::int as run
  from days
),
runs as (
  select profile_id, run, count(*)::int as length, max(day) as last_day
  from ranked group by profile_id, run
)
select
  profile_id,
  max(length) filter (
    where last_day >= (now() at time zone 'UTC')::date - 1
  )::int as current_days,
  (select count(distinct day) from days d where d.profile_id = r.profile_id)::int as active_days,
  max(last_day) as last_active_on
from runs r
group by profile_id;

-- ────────────────────────────────────────────────────────────────────────────
-- The functions that write progress
-- ────────────────────────────────────────────────────────────────────────────

/*
 * None of the three below is granted to `authenticated`.
 *
 * That sentence is the security model for this whole prompt. XP, skill
 * evidence and milestones are written by these functions and by nothing else;
 * the functions are called from inside the domain functions that already
 * existed — `complete_lesson`, `complete_mission`, `submit_artifact`,
 * `review_artifact` — in the same transaction as the event that justified the
 * award. A learner cannot call them, and there is no table grant that would
 * let them write the rows directly.
 */

create or replace function public.award_xp(
  p_profile_id uuid,
  p_kind public.xp_event_kind,
  p_subject_type text,
  p_subject_key text,
  p_detail text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount integer;
begin
  if p_profile_id is null or p_subject_key is null or btrim(p_subject_key) = '' then
    return;
  end if;

  select amount into v_amount from public.xp_rules where kind = p_kind;
  if v_amount is null then
    return;  -- No rule, no award. A missing rule is not worth aborting a completion for.
  end if;

  -- `do nothing` is the duplicate protection, enforced by xp_events_once_idx.
  insert into public.xp_events (profile_id, kind, amount, subject_type, subject_key, detail)
  values (p_profile_id, p_kind, v_amount, p_subject_type, btrim(p_subject_key), btrim(p_detail))
  on conflict do nothing;
end;
$$;

/*
 * Record that a learner showed a skill, for every skill the source teaches.
 *
 * Takes the source rather than the skill: the caller says "this lesson was
 * completed" and the function looks up which skills that lesson introduces.
 * That keeps the mapping in `lesson_skills` / `mission_skills` where an author
 * edits it, rather than in the call sites.
 */
create or replace function public.record_skill_evidence(
  p_profile_id uuid,
  p_kind public.skill_evidence_kind,
  p_lesson_id uuid default null,
  p_mission_id uuid default null,
  p_artifact_id uuid default null,
  p_detail text default ''
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_written integer := 0;
  v_mission uuid;
begin
  if p_kind = 'lesson_completed' and p_lesson_id is not null then
    insert into public.skill_evidence (profile_id, skill_key, kind, lesson_id, detail)
    select p_profile_id, ls.skill_key, 'lesson_completed', p_lesson_id, btrim(p_detail)
    from public.lesson_skills ls
    where ls.lesson_id = p_lesson_id
    on conflict do nothing;

  elsif p_kind = 'mission_completed' and p_mission_id is not null then
    insert into public.skill_evidence (profile_id, skill_key, kind, mission_id, detail)
    select p_profile_id, msk.skill_key, 'mission_completed', p_mission_id, btrim(p_detail)
    from public.mission_skills msk
    where msk.mission_id = p_mission_id
    on conflict do nothing;

  elsif p_kind = 'artifact_approved' and p_artifact_id is not null then
    /*
     * An artifact proves the skills of the mission it answers. An artifact
     * with no mission proves nothing in particular — it is work the learner
     * chose to do, and inferring a capability from it would be guessing.
     */
    select mission_id into v_mission from public.artifacts where id = p_artifact_id;
    if v_mission is null then
      return 0;
    end if;

    insert into public.skill_evidence (profile_id, skill_key, kind, artifact_id, detail)
    select p_profile_id, msk.skill_key, 'artifact_approved', p_artifact_id, btrim(p_detail)
    from public.mission_skills msk
    where msk.mission_id = v_mission
    on conflict do nothing;
  end if;

  get diagnostics v_written = row_count;
  return v_written;
end;
$$;

/*
 * Is this milestone's requirement met, right now, for this learner?
 *
 * One function, one CASE, nine predicates — and every one of them is a count
 * against records that already exist. Nothing here reads a timestamp of a page
 * view or a session, because none of that is capability. Given the same
 * database the answer never changes, which is what makes the tests below able
 * to assert it.
 *
 * `stable` rather than `volatile`: it reads and does not write, so the planner
 * may call it once per statement.
 */
create or replace function public.milestone_is_met(
  p_profile_id uuid,
  p_requirement public.milestone_requirement,
  p_config jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count integer := coalesce((p_config ->> 'count')::integer, 1);
  v_phase text := p_config ->> 'phase';
  v_slug text := p_config ->> 'slug';
  v_skill text := p_config ->> 'skill';
  v_evidence text := p_config ->> 'evidence_kind';
  v_type text := p_config ->> 'mission_type';
  v_n integer;
begin
  case p_requirement

    when 'project_started' then
      return exists (select 1 from public.projects where profile_id = p_profile_id);

    when 'lessons_completed' then
      select count(*) into v_n
      from public.learner_lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
      join public.modules m on m.id = l.module_id
      where lp.profile_id = p_profile_id
        and lp.status = 'completed'
        and (v_phase is null or m.phase_key = v_phase);
      return v_n >= v_count;

    when 'missions_completed' then
      select count(*) into v_n
      from public.learner_mission_progress mp
      join public.missions ms on ms.id = mp.mission_id
      where mp.profile_id = p_profile_id
        and mp.status = 'completed'
        and (v_phase is null or ms.phase_key = v_phase)
        and (v_type is null or ms.type::text = v_type);
      return v_n >= v_count;

    when 'mission_completed' then
      return exists (
        select 1 from public.learner_mission_progress mp
        join public.missions ms on ms.id = mp.mission_id
        where mp.profile_id = p_profile_id and mp.status = 'completed' and ms.slug = v_slug
      );

    when 'artifacts_submitted' then
      select count(*) into v_n
      from public.artifacts a
      where a.profile_id = p_profile_id and a.submitted_at is not null;
      return v_n >= v_count;

    when 'artifacts_approved' then
      select count(*) into v_n
      from public.artifacts a
      where a.profile_id = p_profile_id and a.status in ('approved', 'final');
      return v_n >= v_count;

    when 'evidence_submitted' then
      /*
       * The artifact has to have been submitted, not merely drafted. A URL
       * pasted into a draft nobody has seen is not proof of a deployment.
       */
      return exists (
        select 1 from public.evidence e
        join public.artifacts a on a.id = e.artifact_id
        where a.profile_id = p_profile_id
          and a.status <> 'draft'
          and e.kind::text = v_evidence
      );

    when 'skill_demonstrated' then
      return exists (
        select 1 from public.learner_skill_states s
        where s.profile_id = p_profile_id
          and s.skill_key = v_skill
          and s.state in ('demonstrated', 'strong')
      );

    when 'phase_completed' then
      /*
       * `units_total > 0` is doing real work here: without it, a phase whose
       * curriculum has not been written yet would be vacuously complete and
       * the learner would be congratulated on day one for finishing MONETIZE.
       */
      return exists (
        select 1 from public.learner_phase_progress p
        where p.profile_id = p_profile_id
          and p.phase_key = v_phase
          and p.units_total > 0
          and p.percent = 100
      );

    when 'manual' then
      -- Never met automatically. A mentor awards it, or nobody does.
      return false;

  end case;
  return false;
end;
$$;

/*
 * Award everything the learner has newly earned, and tell them.
 *
 * Called at the end of every domain function that could change the answer.
 * Awarding is idempotent — `learner_milestones` has a primary key on (learner,
 * milestone) and the insert conflicts away — so running it after every event
 * is cheap and running it twice is harmless.
 *
 * Each award also writes an XP event and a notification, in this transaction.
 * A milestone the learner is never told about is a row in a table.
 */
create or replace function public.evaluate_milestones(p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.milestones;
  v_awarded integer := 0;
begin
  for v_row in
    select * from public.milestones m
    where m.published
      and m.requirement <> 'manual'
      and not exists (
        select 1 from public.learner_milestones lm
        where lm.profile_id = p_profile_id and lm.milestone_key = m.key
      )
    order by m.position
  loop
    if public.milestone_is_met(p_profile_id, v_row.requirement, v_row.requirement_config) then
      insert into public.learner_milestones (profile_id, milestone_key)
      values (p_profile_id, v_row.key)
      on conflict do nothing;

      if found then
        v_awarded := v_awarded + 1;

        perform public.award_xp(
          p_profile_id, 'milestone_earned', 'milestone', v_row.key, v_row.title
        );

        insert into public.notifications (profile_id, kind, title, body, href)
        values (
          p_profile_id, 'milestone_earned',
          v_row.title, v_row.summary, '/progress/achievements'
        );
      end if;
    end if;
  end loop;

  return v_awarded;
end;
$$;

/*
 * A mentor awards a milestone the database cannot see.
 *
 * FIRST USER and FIRST PAYMENT are the reason this exists. LOCK has no
 * analytics and no billing integration, so it genuinely does not know whether
 * somebody got a customer — and a requirement type that guessed from a
 * self-reported checkbox would be exactly the fake functionality the brief
 * forbids. A mentor looks at the evidence and says so, and the row records who
 * said it.
 *
 * The two refusals that matter: only staff may call it, and never for their
 * own account.
 */
create or replace function public.award_milestone(
  p_profile_id uuid,
  p_milestone_key text,
  p_note text default ''
)
returns public.learner_milestones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_milestone public.milestones;
  v_row public.learner_milestones;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_staff() then
    raise exception 'only a mentor may award a milestone' using errcode = 'insufficient_privilege';
  end if;

  if p_profile_id = v_uid then
    raise exception 'you cannot award yourself a milestone' using errcode = 'insufficient_privilege';
  end if;

  if not public.can_review(p_profile_id) then
    raise exception 'that learner is not assigned to you' using errcode = 'insufficient_privilege';
  end if;

  select * into v_milestone from public.milestones where key = p_milestone_key and published;
  if v_milestone.key is null then
    raise exception 'no such milestone' using errcode = 'no_data_found';
  end if;

  insert into public.learner_milestones (profile_id, milestone_key, awarded_by, note)
  values (p_profile_id, p_milestone_key, v_uid, btrim(p_note))
  on conflict (profile_id, milestone_key) do nothing
  returning * into v_row;

  if v_row.profile_id is null then
    raise exception 'already earned' using errcode = 'unique_violation';
  end if;

  perform public.award_xp(p_profile_id, 'milestone_earned', 'milestone', p_milestone_key,
                          v_milestone.title);

  insert into public.notifications (profile_id, kind, title, body, href)
  values (p_profile_id, 'milestone_earned', v_milestone.title, v_milestone.summary,
          '/progress/achievements');

  return v_row;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Hooking progress onto the events that already exist
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Four functions are replaced below, and each one gains the same three lines
 * at the end: award the XP, record the skill evidence, re-evaluate the
 * milestones. Nothing else about them changes.
 *
 * They are replaced rather than wrapped in triggers because the awards belong
 * in the same transaction as the thing that earned them — a mission that
 * completes but whose XP write fails should not be a completed mission. A
 * trigger would give the same transaction; what it would not give is the
 * ordering and the ability to read the local variables these functions have
 * already computed.
 *
 * `project_started` has no domain function to hook — a project is created
 * through an ordinary insert — so it gets an AFTER INSERT trigger instead,
 * further down.
 */

-- ── Lesson completion ───────────────────────────────────────────────────────

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
  v_title text;
  v_row public.learner_lesson_progress;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select completion_rule, title into v_rule, v_title
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

  /*
   * Introduced, and no further. A completed lesson is the weakest evidence the
   * skill system accepts, and `learner_skill_states` caps it at `introduced`
   * however many lessons are finished.
   */
  perform public.award_xp(v_uid, 'lesson_completed', 'lesson', p_lesson_id::text, v_title);
  perform public.record_skill_evidence(v_uid, 'lesson_completed', p_lesson_id, null, null, v_title);
  perform public.evaluate_milestones(v_uid);

  return v_row;
end;
$$;

-- ── Mission completion ──────────────────────────────────────────────────────

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

  if v_mission.requires_review and v_artifact.status not in ('approved', 'final') then
    raise exception 'this mission needs mentor approval' using errcode = 'check_violation';
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

  perform public.award_xp(v_uid, 'mission_completed', 'mission', p_mission_id::text, v_mission.title);

  -- The reflection is its own award, because writing one is its own work.
  if v_reflection is not null then
    perform public.award_xp(v_uid, 'reflection_submitted', 'mission', p_mission_id::text,
                            v_mission.title);
  end if;

  perform public.record_skill_evidence(v_uid, 'mission_completed', null, p_mission_id, null,
                                       v_mission.title);
  perform public.evaluate_milestones(v_uid);

  return v_row;
end;
$$;

-- ── Submission ──────────────────────────────────────────────────────────────

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
  v_reviewer uuid;
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
    'Submitted ' || v_artifact.title, coalesce(v_mission.title, ''), true
  );

  for v_reviewer in
    select mentor_id from public.learner_mentor_relationships where learner_id = v_uid
  loop
    insert into public.notifications (profile_id, kind, title, body, href)
    values (
      v_reviewer, 'artifact_submitted',
      'New submission: ' || v_artifact.title,
      coalesce(v_mission.title, ''),
      '/review/artifacts/' || v_artifact.id
    );
  end loop;

  /*
   * Submitting earns XP and nothing else. No skill evidence: putting work up
   * for judgement is not the same as the work being any good, and the skill
   * system only moves on the verdict. Milestones are still re-evaluated,
   * because FIRST DEPLOY is about evidence being submitted rather than
   * approved — a deployment URL is a fact whether or not the write-up holds.
   */
  perform public.award_xp(v_uid, 'artifact_submitted', 'artifact', p_artifact_id::text,
                          v_artifact.title);
  perform public.evaluate_milestones(v_uid);

  return v_artifact;
end;
$$;

-- ── Review ──────────────────────────────────────────────────────────────────

create or replace function public.review_artifact(
  p_artifact_id uuid,
  p_status public.artifact_status,
  p_what_works text default '',
  p_what_needs_work text default '',
  p_why text default '',
  p_next_step text default '',
  p_category public.feedback_category default 'other'
)
returns public.artifact_feedback
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_artifact public.artifacts;
  v_row public.artifact_feedback;
  v_verb text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_staff() then
    raise exception 'only a mentor may review work' using errcode = 'insufficient_privilege';
  end if;

  if p_status not in ('approved', 'needs_work', 'final') then
    raise exception 'a review decision must be a verdict' using errcode = 'check_violation';
  end if;

  select * into v_artifact from public.artifacts where id = p_artifact_id;
  if v_artifact.id is null then
    raise exception 'no such artifact' using errcode = 'no_data_found';
  end if;

  if v_artifact.profile_id = v_uid then
    raise exception 'you cannot review your own work' using errcode = 'insufficient_privilege';
  end if;

  if not public.can_review(v_artifact.profile_id) then
    raise exception 'that learner is not assigned to you' using errcode = 'insufficient_privilege';
  end if;

  if v_artifact.status = 'draft' then
    raise exception 'that work has not been submitted' using errcode = 'check_violation';
  end if;

  insert into public.artifact_feedback
    (artifact_id, reviewer_id, status, what_works, what_needs_work, why, next_step, category)
  values (
    p_artifact_id, v_uid, p_status,
    btrim(p_what_works), btrim(p_what_needs_work), btrim(p_why), btrim(p_next_step),
    p_category
  )
  returning * into v_row;

  update public.artifacts set status = p_status where id = p_artifact_id;

  v_verb := case p_status
    when 'approved' then 'Approved'
    when 'final' then 'Marked final'
    else 'Returned for more work' end;

  insert into public.build_log_entries
    (project_id, profile_id, mission_id, artifact_id, title, detail, is_automatic)
  values (
    v_artifact.project_id, v_artifact.profile_id, v_artifact.mission_id, v_artifact.id,
    v_verb || ': ' || v_artifact.title,
    coalesce(nullif(btrim(p_next_step), ''), btrim(p_what_works)),
    true
  );

  insert into public.notifications (profile_id, kind, title, body, href)
  values (
    v_artifact.profile_id, 'artifact_reviewed',
    v_verb || ': ' || v_artifact.title,
    coalesce(nullif(btrim(p_next_step), ''), ''),
    '/mentor'
  );

  /*
   * This is the heaviest event in the system, and the only one that can move a
   * skill past `practicing`. `needs_work` earns nothing — not as a punishment,
   * but because a rejected artifact has not demonstrated anything yet, and
   * paying for the attempt would make the skill states meaningless.
   *
   * The awards go to the learner, never to the reviewer.
   */
  if p_status in ('approved', 'final') then
    perform public.award_xp(v_artifact.profile_id, 'artifact_approved', 'artifact',
                            p_artifact_id::text, v_artifact.title);
    perform public.record_skill_evidence(v_artifact.profile_id, 'artifact_approved',
                                         null, null, p_artifact_id, v_artifact.title);
  end if;

  perform public.evaluate_milestones(v_artifact.profile_id);

  return v_row;
end;
$$;

-- ── Starting a project ──────────────────────────────────────────────────────

/*
 * A trigger, because a project is created by an ordinary insert rather than by
 * a domain function. `after insert` so the row exists when
 * `evaluate_milestones` looks for it — FIRST IDEA is met by that row existing.
 */
create or replace function public.project_started_awards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_xp(new.profile_id, 'project_started', 'project', new.id::text, new.name);
  perform public.evaluate_milestones(new.profile_id);
  return null;
end;
$$;

create trigger projects_award_progress
  after insert on public.projects
  for each row execute function public.project_started_awards();

-- ────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Read the grants below for what is absent rather than for what is present.
 *
 * There is no insert, update or delete for `authenticated` on `xp_events`,
 * `skill_evidence` or `learner_milestones` — at any role, learner or mentor or
 * admin. That is the answer to "a learner must not award themselves XP, mark a
 * milestone earned, or change a skill level": the privilege does not exist to
 * be misused, so no policy has to be relied on to catch it. Every one of those
 * rows is written by a `security definer` function running as the table owner,
 * called from inside the transaction that did the work.
 *
 * `skills`, `milestones` and `xp_rules` are definitions: read-only to clients
 * and authored with SQL, exactly like lessons and missions.
 */
revoke all on public.skills, public.lesson_skills, public.mission_skills,
  public.milestones, public.xp_rules from anon, authenticated;
grant select on public.skills, public.lesson_skills, public.mission_skills,
  public.milestones, public.xp_rules to authenticated;

revoke all on public.skill_evidence, public.xp_events, public.learner_milestones
  from anon, authenticated;
grant select on public.skill_evidence, public.xp_events, public.learner_milestones
  to authenticated;

-- The views are read-only by construction; `security_invoker` means the
-- policies on the tables beneath them still decide which rows come back.
revoke all on public.learner_skill_states, public.learner_xp_totals,
  public.learner_module_progress, public.learner_phase_progress,
  public.learner_overall_progress, public.learner_activity, public.learner_streak
  from anon, authenticated;
grant select on public.learner_skill_states, public.learner_xp_totals,
  public.learner_module_progress, public.learner_phase_progress,
  public.learner_overall_progress, public.learner_activity, public.learner_streak
  to authenticated;

/*
 * The three award functions are revoked from everyone and granted to nobody.
 *
 * They are called only from other definer functions, which run as the owner
 * and therefore do not need a grant. Leaving `execute` with PUBLIC would hand
 * `authenticated` a direct way to write XP for any profile id it cared to
 * name — which is precisely the attack this prompt has to close.
 */
revoke execute on function
  public.award_xp(uuid, public.xp_event_kind, text, text, text) from public;
revoke execute on function public.record_skill_evidence(
  uuid, public.skill_evidence_kind, uuid, uuid, uuid, text) from public;
revoke execute on function public.evaluate_milestones(uuid) from public;
revoke execute on function public.milestone_is_met(
  uuid, public.milestone_requirement, jsonb) from public;
revoke execute on function public.stamp_published_at() from public;
revoke execute on function public.project_started_awards() from public;

-- The one award function a client may call, and only staff get past its first
-- three checks.
revoke execute on function public.award_milestone(uuid, text, text) from public;
grant execute on function public.award_milestone(uuid, text, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.skills enable row level security;
alter table public.lesson_skills enable row level security;
alter table public.mission_skills enable row level security;
alter table public.skill_evidence enable row level security;
alter table public.xp_rules enable row level security;
alter table public.xp_events enable row level security;
alter table public.milestones enable row level security;
alter table public.learner_milestones enable row level security;

-- Definitions: published ones to everybody signed in, drafts to staff.
create policy "published skills are readable" on public.skills
  for select to authenticated using (published or public.is_staff());

create policy "skill links follow their skill" on public.lesson_skills
  for select to authenticated using (
    exists (select 1 from public.skills s where s.key = skill_key and (s.published or public.is_staff()))
  );

create policy "mission skill links follow their skill" on public.mission_skills
  for select to authenticated using (
    exists (select 1 from public.skills s where s.key = skill_key and (s.published or public.is_staff()))
  );

create policy "published milestones are readable" on public.milestones
  for select to authenticated using (published or public.is_staff());

-- The XP table is the product explaining its own scoring. Hiding it would make
-- the numbers unauditable, which is the opposite of the point.
create policy "xp rules are readable" on public.xp_rules
  for select to authenticated using (true);

/*
 * Learner records: yours, and your mentor's to read.
 *
 * `can_review()` rather than `is_staff()`, matching every other learner-owned
 * table since Prompt 6 — a mentor sees the progress of the learners assigned
 * to them and of nobody else. There is no insert, update or delete policy on
 * any of the three, and that is not an omission.
 */
create policy "your skill evidence, and your mentor may read it" on public.skill_evidence
  for select to authenticated using (public.can_review(profile_id));

create policy "your xp, and your mentor may read it" on public.xp_events
  for select to authenticated using (public.can_review(profile_id));

create policy "your milestones, and your mentor may read them" on public.learner_milestones
  for select to authenticated using (public.can_review(profile_id));
