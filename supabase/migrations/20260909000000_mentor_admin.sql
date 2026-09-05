-- LOCK — the mentor layer
--
-- The human guidance loop:
--
--   LEARN → DO → SUBMIT → PROVE → REVIEW → IMPROVE → ADVANCE
--
-- Three things this migration is careful about, and each is a decision rather
-- than a mechanism:
--
-- 1. **A learner can never approve their own work.** Prompt 4 kept `status` off
--    the learner's update grant; this migration adds the only path that sets it
--    to `approved` or `final`, and that path checks the caller is a reviewer for
--    that learner.
--
-- 2. **Reviews are append-only.** A returned artifact that is later approved has
--    two rows, not one edited row. "You submitted this twice before it was
--    approved" is information the learner should keep.
--
-- 3. **Staff access is narrowed.** Until now `is_staff()` opened every learner's
--    work to every mentor, which was fine with one learner and is wrong as a
--    rule. Access now runs through an explicit relationship, and the existing
--    policies are rewritten to use it.

-- ────────────────────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────────────────────

-- A mentor who has opened the work but not yet decided. Without it, "nobody has
-- looked at this" and "somebody is reading it now" are the same state.
alter type public.artifact_status add value if not exists 'in_review' after 'submitted';

create type public.feedback_category as enum (
  'product', 'research', 'ux', 'technical', 'business', 'quality', 'other'
);

create type public.question_status as enum ('open', 'answered', 'closed');

create type public.notification_kind as enum (
  'artifact_submitted', 'artifact_reviewed', 'question_asked', 'question_answered'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Who may review whom
-- ────────────────────────────────────────────────────────────────────────────

/*
 * The mentor relationship.
 *
 * One row per pairing. The product today is David and Zevo, and the table is
 * still worth having: without it "mentor" means "may read every learner's
 * work", which is a rule that becomes wrong the moment there are two learners
 * and is invisible until then.
 */
create table public.learner_mentor_relationships (
  learner_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (learner_id, mentor_id),
  constraint mentor_is_not_the_learner check (learner_id <> mentor_id)
);

create index mentor_relationship_mentor_idx on public.learner_mentor_relationships (mentor_id);

/*
 * May the caller review this learner's work?
 *
 * An admin may, everywhere — that is what the role is for. A mentor may only
 * where a relationship exists. A learner may see their own, which keeps every
 * policy below to one predicate instead of two.
 *
 * `security definer`, for the same reason as `is_staff()`: a policy on a table
 * that reads a relationship table would otherwise need its own policy, and the
 * recursion is not worth the elegance.
 */
create or replace function public.can_review(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = p_learner_id
    or public.is_admin()
    or exists (
      select 1 from public.learner_mentor_relationships r
      where r.learner_id = p_learner_id
        and r.mentor_id = (select auth.uid())
    );
$$;

revoke execute on function public.can_review(uuid) from public;
grant execute on function public.can_review(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Review
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Structured feedback, because "looks good" teaches nothing.
 *
 * Four fields rather than one comment box, and they are the four a learner
 * needs to act: what worked, what did not, why it matters, what to do next.
 * `what_needs_work` and `next_step` are required on a `needs_work` verdict —
 * enforced below — so a rejection cannot be a shrug.
 */
alter table public.artifact_feedback
  add column what_works text not null default '',
  add column what_needs_work text not null default '',
  add column why text not null default '',
  add column next_step text not null default '',
  add column category public.feedback_category not null default 'other',
  add column updated_at timestamptz not null default now();

-- `final` is a verdict too: the artifact is accepted and settled.
alter table public.artifact_feedback drop constraint feedback_status_is_a_verdict;
alter table public.artifact_feedback
  add constraint feedback_status_is_a_verdict
  check (status in ('approved', 'needs_work', 'final'));

-- A rejection has to say what to fix.
alter table public.artifact_feedback
  add constraint feedback_rejection_is_actionable
  check (
    status <> 'needs_work'
    or (length(btrim(what_needs_work)) >= 10 and length(btrim(next_step)) >= 10)
  );

create trigger artifact_feedback_touch before update on public.artifact_feedback
  for each row execute function public.touch_updated_at();

/*
 * Mentor notes: private, and about the learner rather than about one artifact.
 *
 * "Struggling to narrow ICP" is context a mentor needs across six missions and
 * must never be shown to the learner — a note somebody knows is read is a note
 * that stops being honest. No policy anywhere lets a learner select these, and
 * there is a test that tries.
 */
create table public.mentor_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentor_note_says_something check (length(btrim(body)) between 3 and 5000)
);

create index mentor_notes_learner_idx on public.mentor_notes (learner_id, created_at desc);

create trigger mentor_notes_touch before update on public.mentor_notes
  for each row execute function public.touch_updated_at();

/*
 * Asking the mentor.
 *
 * Deliberately not a chat table. A question is attached to the work it is about
 * — a mission, an artifact, the project — and answered once. No presence, no
 * threads, no typing indicators: the mentor's job is to improve judgement, and
 * an interface that rewards fast back-and-forth produces a mentor who writes
 * the answer instead of the question that leads to it.
 */
create table public.mentor_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid references public.profiles (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  mission_id uuid references public.missions (id) on delete set null,
  artifact_id uuid references public.artifacts (id) on delete set null,
  question text not null,
  response text not null default '',
  status public.question_status not null default 'open',
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint question_says_something check (length(btrim(question)) between 10 and 4000),
  constraint answered_has_a_response check (
    (status = 'answered') = (length(btrim(response)) > 0)
  )
);

create index mentor_questions_learner_idx on public.mentor_questions (learner_id, created_at desc);
create index mentor_questions_open_idx on public.mentor_questions (status) where status = 'open';

create trigger mentor_questions_touch before update on public.mentor_questions
  for each row execute function public.touch_updated_at();

/*
 * Notifications.
 *
 * Four kinds, each corresponding to something a person actually did. No
 * activity feed, no counters of things that do not matter — a notification
 * nobody would act on is noise that teaches people to ignore the ones that
 * matter.
 */
create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null default '',
  /* A path inside LOCK. Never an external URL — a notification is not a place
     to send somebody off the platform. */
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_href_is_internal check (href is null or href ~ '^/')
);

create index notifications_unread_idx on public.notifications (profile_id, created_at desc)
  where read_at is null;

-- Missions that need a human verdict before they count as done.
alter table public.missions
  add column requires_review boolean not null default false;

comment on column public.missions.requires_review is
  'When true, complete_mission() refuses until a mentor has approved the artifact.';

-- ────────────────────────────────────────────────────────────────────────────
-- The review itself
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Record a review decision.
 *
 * The only path that writes `approved` or `final` to an artifact, and it checks
 * three things a learner cannot satisfy for themselves: the caller is staff,
 * the caller may review this particular learner, and the caller is not the
 * learner. That last check is not redundant — an admin who is also a learner
 * would otherwise pass the first two.
 *
 * Appends a feedback row rather than editing one, writes the build log, and
 * notifies. All in one transaction, so a review that half-happened is not a
 * state the product can reach.
 */
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

  -- Nobody reviews their own work, whatever role they hold.
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

  return v_row;
end;
$$;

/*
 * Answer a question.
 *
 * Separate from an ordinary update because answering sets three columns that
 * have to move together, and because the learner must never be able to write a
 * response into their own question and read it back as the mentor's.
 */
create or replace function public.answer_question(p_question_id uuid, p_response text)
returns public.mentor_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.mentor_questions;
  v_learner uuid;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'only a mentor may answer' using errcode = 'insufficient_privilege';
  end if;

  if length(btrim(coalesce(p_response, ''))) < 10 then
    raise exception 'an answer that says nothing is not an answer'
      using errcode = 'check_violation';
  end if;

  select learner_id into v_learner from public.mentor_questions where id = p_question_id;
  if v_learner is null then
    raise exception 'no such question' using errcode = 'no_data_found';
  end if;

  if not public.can_review(v_learner) or v_learner = v_uid then
    raise exception 'that learner is not assigned to you' using errcode = 'insufficient_privilege';
  end if;

  update public.mentor_questions
  set response = btrim(p_response),
      status = 'answered',
      mentor_id = v_uid,
      answered_at = now()
  where id = p_question_id
  returning * into v_row;

  insert into public.notifications (profile_id, kind, title, body, href)
  values (v_learner, 'question_answered', 'Your mentor answered', left(btrim(p_response), 200), '/mentor');

  return v_row;
end;
$$;

/*
 * Completion, now aware of review.
 *
 * Replaces the Prompt 4 function with one extra clause. A mission with
 * `requires_review` refuses until a mentor has approved the artifact — which is
 * the distinction the whole prompt turns on: finishing a mission is not the
 * same as having done it well, and only one of those two facts is the learner's
 * to assert.
 *
 * Most missions leave `requires_review` false. Requiring a human on every one
 * would make the mentor a bottleneck and the learner passive, which is the
 * opposite of the point.
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

  return v_row;
end;
$$;

/*
 * Submitting now tells the mentor.
 *
 * Same function as Prompt 4 with a notification appended — a submission nobody
 * is told about is a submission that waits a week.
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

  -- Every mentor assigned to this learner hears about it.
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

  return v_artifact;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Narrowing staff access to assigned learners
-- ────────────────────────────────────────────────────────────────────────────

/*
 * Every policy below used `is_staff()`, which meant any mentor could read any
 * learner's work. With one learner that was invisible; as a rule it is wrong.
 * `can_review()` replaces it: your own rows, plus the rows of learners actually
 * assigned to you, plus everything for an admin.
 */

drop policy "progress is yours, and readable by staff" on public.learner_lesson_progress;
create policy "progress is yours, and readable by your mentor" on public.learner_lesson_progress
  for select to authenticated using (public.can_review(profile_id));

drop policy "responses are yours, and readable by staff" on public.learner_block_responses;
create policy "responses are yours, and readable by your mentor" on public.learner_block_responses
  for select to authenticated using (public.can_review(profile_id));

drop policy "your projects, and staff may read them" on public.projects;
create policy "your projects, and your mentor may read them" on public.projects
  for select to authenticated using (public.can_review(profile_id));

drop policy "your artifacts, and staff may read them" on public.artifacts;
create policy "your artifacts, and your mentor may read them" on public.artifacts
  for select to authenticated using (public.can_review(profile_id));

drop policy "evidence follows its artifact" on public.evidence;
create policy "evidence follows its artifact" on public.evidence
  for select to authenticated using (
    exists (select 1 from public.artifacts a
            where a.id = artifact_id and public.can_review(a.profile_id))
  );

drop policy "your mission progress, and staff may read it" on public.learner_mission_progress;
create policy "your mission progress, and your mentor may read it" on public.learner_mission_progress
  for select to authenticated using (public.can_review(profile_id));

drop policy "your build log, and staff may read it" on public.build_log_entries;
create policy "your build log, and your mentor may read it" on public.build_log_entries
  for select to authenticated using (public.can_review(profile_id));

drop policy "feedback is readable by the learner and staff" on public.artifact_feedback;
create policy "feedback is readable by the learner and their mentor" on public.artifact_feedback
  for select to authenticated using (
    exists (select 1 from public.artifacts a
            where a.id = artifact_id and public.can_review(a.profile_id))
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────────────────────

revoke all on public.learner_mentor_relationships, public.mentor_notes,
  public.mentor_questions, public.notifications from anon, authenticated;

grant select on public.learner_mentor_relationships to authenticated;

-- Notes are staff-only in every direction, including select.
grant select, insert, delete on public.mentor_notes to authenticated;
grant update (body) on public.mentor_notes to authenticated;

-- A learner writes the question; only `answer_question()` writes the response.
grant select, insert on public.mentor_questions to authenticated;
grant update (question) on public.mentor_questions to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- No insert on `artifact_feedback` for anybody: `review_artifact()` is the path.
revoke insert, update, delete on public.artifact_feedback from anon, authenticated;

revoke execute on function public.review_artifact(uuid, public.artifact_status, text, text, text, text, public.feedback_category) from public;
revoke execute on function public.answer_question(uuid, text) from public;
grant execute on function public.review_artifact(uuid, public.artifact_status, text, text, text, text, public.feedback_category) to authenticated;
grant execute on function public.answer_question(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.learner_mentor_relationships enable row level security;
alter table public.mentor_notes enable row level security;
alter table public.mentor_questions enable row level security;
alter table public.notifications enable row level security;

-- A learner may see who their mentor is. That is the whole of it.
create policy "you see your own pairing" on public.learner_mentor_relationships
  for select to authenticated using (
    (select auth.uid()) = learner_id or (select auth.uid()) = mentor_id or public.is_admin()
  );

/*
 * Mentor notes: staff only, and only for learners they may review.
 *
 * There is no learner-facing policy at all. A note the learner might read is a
 * note that stops being honest, and the honesty is the entire value.
 */
create policy "notes about your learners" on public.mentor_notes
  for select to authenticated using (
    public.is_staff() and learner_id <> (select auth.uid()) and public.can_review(learner_id)
  );
create policy "you write notes about your learners" on public.mentor_notes
  for insert to authenticated with check (
    public.is_staff() and (select auth.uid()) = author_id
    and learner_id <> (select auth.uid()) and public.can_review(learner_id)
  );
create policy "you edit your own notes" on public.mentor_notes
  for update to authenticated
  using (public.is_staff() and (select auth.uid()) = author_id)
  with check (public.is_staff() and (select auth.uid()) = author_id);
create policy "you delete your own notes" on public.mentor_notes
  for delete to authenticated
  using (public.is_staff() and (select auth.uid()) = author_id);

create policy "your questions, and your mentor's view of them" on public.mentor_questions
  for select to authenticated using (public.can_review(learner_id));
create policy "you ask your own questions" on public.mentor_questions
  for insert to authenticated with check ((select auth.uid()) = learner_id);
create policy "you edit your own unanswered question" on public.mentor_questions
  for update to authenticated
  using ((select auth.uid()) = learner_id and status = 'open')
  with check ((select auth.uid()) = learner_id);

create policy "your notifications" on public.notifications
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "you mark your own notifications read" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
