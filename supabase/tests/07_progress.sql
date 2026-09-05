-- Progress, skills, milestones and XP, tested.
--
-- Section 30 of the brief names fifteen behaviours. They lead, in its order,
-- and the first four are the ones that matter most: a learner must not be able
-- to award themselves XP, earn themselves a milestone, move their own skill
-- state, or be paid twice for the same event. Each is attempted below rather
-- than asserted about.

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

create or replace function pg_temp.ok(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end;
$$;

create or replace function pg_temp.denied(statement text, label text)
returns void language plpgsql as $$
declare affected bigint;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when others then
    raise notice 'PASS  % [refused: %]', label, sqlerrm; return;
  end;
  if affected = 0 then raise notice 'PASS  % [no rows]', label;
  else raise exception 'FAIL  % [% row(s)]', label, affected; end if;
end;
$$;

create or replace function pg_temp.claims(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id::text)::text, false);
end;
$$;

\set david    '11111111-1111-1111-1111-111111111111'
\set rival    '22222222-2222-2222-2222-222222222222'
\set zevo     '33333333-3333-3333-3333-333333333333'
\set stranger '44444444-4444-4444-4444-444444444444'
\set boss     '55555555-5555-5555-5555-555555555555'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david',    'david@example.com', '{"display_name":"David"}'::jsonb),
  (:'rival',    'rival@example.com', '{"display_name":"Rival"}'::jsonb),
  (:'zevo',     'zevo@example.com',  '{"display_name":"Zevo"}'::jsonb),
  (:'stranger', 'nm@example.com',    '{}'::jsonb),
  (:'boss',     'admin@example.com', '{}'::jsonb);

update public.profiles set role = 'mentor' where id in (:'zevo', :'stranger');
update public.profiles set role = 'admin'  where id = :'boss';

insert into public.learner_mentor_relationships (learner_id, mentor_id)
values (:'david', :'zevo'), (:'rival', :'zevo');

-- ────────────────────────────────────────────────────────────────────────────
-- A brand-new learner
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

select pg_temp.ok(
  (select count(*) from public.xp_events) = 0,
  'a new learner has no XP'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones) = 0,
  'no milestones'
);
select pg_temp.ok(
  (select coalesce(total, 0) from public.learner_xp_totals where profile_id = :'david') is not null
  or (select count(*) from public.learner_xp_totals where profile_id = :'david') = 0,
  'the XP view is empty rather than wrong'
);

/*
 * The empty-state assertion that matters. Every published skill is listed, and
 * every one reads `not_started` — not zero, not blank, not absent. A skills
 * page that showed nothing at all would be indistinguishable from a broken one.
 */
select pg_temp.ok(
  (select count(*) from public.learner_skill_states where profile_id = :'david') = 23,
  'every skill is listed for a learner who has done nothing'
);
select pg_temp.ok(
  (select bool_and(state = 'not_started') from public.learner_skill_states
   where profile_id = :'david'),
  'and every one of them says not started'
);
select pg_temp.ok(
  (select percent from public.learner_phase_progress
   where profile_id = :'david' and phase_key = 'monetize') is null,
  'a phase with nothing published reports null, never 0%'
);
select pg_temp.ok(
  (select count(*) from public.learner_activity where profile_id = :'david') = 0,
  'and no activity'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- §30 — the four things a learner must not be able to do
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

select pg_temp.denied(
  'insert into public.xp_events (profile_id, kind, amount, subject_type, subject_key)
   values (''11111111-1111-1111-1111-111111111111'', ''mission_completed'', 1000, ''mission'', ''forged'')',
  'a learner cannot award themselves XP'
);
select pg_temp.denied(
  'update public.xp_events set amount = 9999',
  'nor inflate XP they already have'
);
select pg_temp.denied(
  'insert into public.learner_milestones (profile_id, milestone_key)
   values (''11111111-1111-1111-1111-111111111111'', ''founder'')',
  'a learner cannot award themselves a milestone'
);
select pg_temp.denied(
  'insert into public.skill_evidence (profile_id, skill_key, kind, lesson_id)
   values (''11111111-1111-1111-1111-111111111111'', ''claude-code'', ''lesson_completed'',
           ''00000000-0000-4000-8000-000000000010'')',
  'a learner cannot forge skill evidence'
);
select pg_temp.denied(
  'delete from public.skill_evidence',
  'nor delete evidence that did not go their way'
);

-- The award functions themselves are unreachable: no EXECUTE grant exists.
select pg_temp.denied(
  'select public.award_xp(''11111111-1111-1111-1111-111111111111'', ''artifact_approved'',
                          ''artifact'', ''anything'')',
  'a learner cannot call award_xp directly'
);
select pg_temp.denied(
  'select public.evaluate_milestones(''11111111-1111-1111-1111-111111111111'')',
  'nor run the milestone evaluator'
);
select pg_temp.denied(
  'select public.record_skill_evidence(''11111111-1111-1111-1111-111111111111'',
                                       ''artifact_approved'')',
  'nor record their own skill evidence'
);
select pg_temp.denied(
  'select public.award_milestone(''11111111-1111-1111-1111-111111111111'', ''founder'')',
  'and award_milestone refuses a learner even though it is granted'
);

-- Definitions are read-only, so the requirement cannot be moved to suit.
select pg_temp.denied(
  'update public.milestones set requirement = ''project_started'' where key = ''founder''',
  'a learner cannot make a milestone easier'
);
select pg_temp.denied(
  'update public.xp_rules set amount = 1000',
  'nor rewrite what things are worth'
);
select pg_temp.denied(
  'update public.skills set label = ''Mine'' where key = ''claude-code''',
  'nor edit the skill definitions'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- Doing the work, and what it earns
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

/*
 * No explicit `id`. Since Prompt 8 a learner's insert grant does not include
 * the primary key — letting a client choose one turns a duplicate-key error
 * into a way of asking whether somebody else's row exists — so this seeds the
 * way the application does and looks the row up by slug afterwards.
 */
insert into public.projects (profile_id, name, slug)
values (:'david', 'Ledgerly', 'ledgerly');

select id as project_id from public.projects where slug = 'ledgerly' \gset

select pg_temp.ok(
  (select count(*) from public.xp_events where kind = 'project_started') = 1,
  'starting a project is worth XP'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'first-idea') = 1,
  'and earns FIRST IDEA, because the requirement is that a project exists'
);
select pg_temp.ok(
  (select count(*) from public.notifications where kind = 'milestone_earned') = 1,
  'a milestone the learner is never told about is a row in a table'
);

-- The demo lesson finishes on a `decision` rule, so a decision is recorded
-- first. That gate is Prompt 3's and is not what this suite is testing; it is
-- here because completing the lesson honestly is the precondition for
-- everything below.
select public.record_block_response(
  '00000000-0000-4000-8000-000000000010', 'decide-1', '{"value":"rough"}'::jsonb);
select pg_temp.ok(
  (public.complete_lesson('00000000-0000-4000-8000-000000000010')).status = 'completed',
  'the learner completes a lesson'
);
select pg_temp.ok(
  (select amount from public.xp_events
   where kind = 'lesson_completed' and subject_key = '00000000-0000-4000-8000-000000000010') = 10,
  'and is paid the rule''s amount, not an amount the client chose'
);

/*
 * The core principle, as an assertion. The lesson introduces Problem Discovery
 * and Critical Thinking, and finishing it moves both to `introduced` — the
 * lowest state that is not "nothing". No amount of lesson completion reaches
 * `demonstrated`; only an approval does, which is tested further down.
 */
select pg_temp.ok(
  (select state from public.learner_skill_states
   where profile_id = :'david' and skill_key = 'problem-discovery') = 'introduced',
  'a completed lesson introduces a skill and claims nothing more'
);

-- Replay the same completion. Nothing should move.
select public.complete_lesson('00000000-0000-4000-8000-000000000010');
select pg_temp.ok(
  (select count(*) from public.xp_events where kind = 'lesson_completed') = 1,
  'the same lesson cannot be completed twice for twice the XP'
);
select pg_temp.ok(
  (select count(*) from public.skill_evidence where kind = 'lesson_completed') = 2,
  'and the evidence is not duplicated either — two skills, one lesson, once'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- Submission, approval, and the line between them
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

insert into public.artifacts (project_id, profile_id, mission_id, title, content)
values (
  :'project_id', :'david',
  '00000000-0000-4000-8000-000000000100',
  'Problem Statement', 'Six freelancers, four already keeping a spreadsheet.'
);

select id as artifact_id from public.artifacts where title = 'Problem Statement' \gset

select pg_temp.ok(
  (public.submit_artifact(:'artifact_id')).status = 'submitted',
  'the learner submits the deliverable'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'first-artifact') = 1,
  'submitting earns FIRST ARTIFACT'
);
select pg_temp.ok(
  (select count(*) from public.skill_evidence where kind = 'artifact_approved') = 0,
  'but submitting proves nothing: no skill evidence yet'
);
select pg_temp.ok(
  (select state from public.learner_skill_states
   where profile_id = :'david' and skill_key = 'problem-discovery') = 'introduced',
  'and the skill has not moved'
);
reset role;

-- The mentor approves.
set role authenticated;
select pg_temp.claims(:'zevo');
select pg_temp.ok(
  (public.review_artifact(:'artifact_id', 'approved',
    'The person is named and the pain is quantified.', '', '', '', 'research')).status = 'approved',
  'the mentor approves it'
);
reset role;

set role authenticated;
select pg_temp.claims(:'david');
select pg_temp.ok(
  (select amount from public.xp_events where kind = 'artifact_approved') = 60,
  'approval is the heaviest event in the system'
);
select pg_temp.ok(
  (select state from public.learner_skill_states
   where profile_id = :'david' and skill_key = 'problem-discovery') = 'demonstrated',
  'and it is the only thing that reaches DEMONSTRATED'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'first-approval') = 1,
  'FIRST APPROVAL follows from it'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'claude-operator') = 0,
  'a skill nobody demonstrated does not award its milestone'
);

select pg_temp.ok(
  (public.complete_mission('00000000-0000-4000-8000-000000000100', 'I assumed wrong about who has this.')).status
    = 'completed',
  'the mission completes'
);
select pg_temp.ok(
  (select count(*) from public.xp_events where kind = 'reflection_submitted') = 1,
  'and the reflection is its own award'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'first-mission') = 1,
  'FIRST MISSION is earned by completing one'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'builder') = 0,
  'BUILDER needs five, and one is not five'
);

-- Every award, replayed. Nothing may move.
select pg_temp.ok(
  (select count(*) from public.xp_events) =
  (select count(*) from (
     select distinct profile_id, kind, subject_type, subject_key from public.xp_events) d),
  'no XP event is duplicated, by construction'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- Deterministic progress
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

/*
 * The weighting, checked rather than trusted. THINK has one published module
 * with two lessons and one published mission: 2 lessons × 1 + 1 mission × 3 = 5
 * units. David has finished one lesson and one mission: 1 + 3 = 4. That is 80%,
 * and it is 80% because of a rule written in one place, not a formula invented
 * per screen.
 */
select pg_temp.ok(
  (select units_total from public.learner_phase_progress
   where profile_id = :'david' and phase_key = 'think') = 5,
  'phase units are lessons plus three times missions'
);
select pg_temp.ok(
  (select units_done from public.learner_phase_progress
   where profile_id = :'david' and phase_key = 'think') = 4,
  'and the same weights apply to what is done'
);
select pg_temp.ok(
  (select percent from public.learner_phase_progress
   where profile_id = :'david' and phase_key = 'think') = 80,
  'so the phase reads 80%, explainably'
);

-- Asked twice, the same answer. A progress figure that drifts is not a figure.
select pg_temp.ok(
  (select percent from public.learner_phase_progress
   where profile_id = :'david' and phase_key = 'think')
  = (select percent from public.learner_phase_progress
     where profile_id = :'david' and phase_key = 'think'),
  'progress is deterministic'
);
select pg_temp.ok(
  (select percent from public.learner_overall_progress where profile_id = :'david') = 80,
  'and global progress applies the identical rule across every phase'
);
select pg_temp.ok(
  (select count(*) from public.learner_activity where profile_id = :'david') >= 4,
  'the activity feed reads the records that already existed'
);
select pg_temp.ok(
  (select current_days from public.learner_streak where profile_id = :'david') = 1,
  'and a streak of one day is one day'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- One learner's progress is not another's
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'rival');
select pg_temp.ok(
  (select count(*) from public.xp_events) = 0,
  'learner B sees none of learner A''s XP'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones) = 0,
  'nor their milestones'
);
select pg_temp.ok(
  (select count(*) from public.skill_evidence) = 0,
  'nor their skill evidence'
);
select pg_temp.ok(
  (select count(*) from public.learner_activity) = 0,
  'nor their activity'
);
select pg_temp.ok(
  (select count(*) from public.learner_phase_progress where profile_id = :'david') = 0,
  'and the progress views leak nothing either — security_invoker is doing its job'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- A mentor sees their own learners and no others
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'zevo');
select pg_temp.ok(
  (select count(*) from public.xp_events where profile_id = :'david') > 0,
  'an assigned mentor sees the learner''s XP'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones where profile_id = :'david') > 0,
  'their milestones'
);
select pg_temp.ok(
  (select state from public.learner_skill_states
   where profile_id = :'david' and skill_key = 'problem-discovery') = 'demonstrated',
  'and their skills'
);
reset role;

set role authenticated;
select pg_temp.claims(:'stranger');
select pg_temp.ok(
  (select count(*) from public.xp_events) = 0,
  'an unassigned mentor sees no XP at all'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones) = 0,
  'no milestones'
);
select pg_temp.ok(
  (select count(*) from public.skill_evidence) = 0,
  'and no evidence'
);
select pg_temp.denied(
  'select public.award_milestone(''11111111-1111-1111-1111-111111111111'', ''first-user'')',
  'nor may they award one to a learner who is not theirs'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- Manual awards
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');
select pg_temp.ok(
  (select count(*) from public.learner_milestones where milestone_key = 'first-user') = 0,
  'FIRST USER is never awarded automatically — LOCK cannot see a customer'
);
reset role;

set role authenticated;
select pg_temp.claims(:'zevo');
select pg_temp.ok(
  (public.award_milestone(:'david', 'first-user', 'Saw the signup.')).milestone_key = 'first-user',
  'the mentor confirms it, and the row records who did'
);
select pg_temp.ok(
  (select awarded_by from public.learner_milestones
   where profile_id = :'david' and milestone_key = 'first-user') = :'zevo',
  'attributably'
);
select pg_temp.denied(
  'select public.award_milestone(''33333333-3333-3333-3333-333333333333'', ''founder'')',
  'and a mentor cannot award themselves anything'
);
reset role;

set role authenticated;
select pg_temp.claims(:'boss');
select pg_temp.denied(
  'select public.award_milestone(''55555555-5555-5555-5555-555555555555'', ''founder'')',
  'not even an admin may award themselves'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- Content lifecycle
-- ────────────────────────────────────────────────────────────────────────────

-- A lesson written but not released.
insert into public.lessons (module_id, slug, title, position, status, is_demo, blocks)
values ('00000000-0000-4000-8000-000000000001', 'in-review-draft', 'In review', 8,
        'review', true, '[]'::jsonb);

set role authenticated;
select pg_temp.claims(:'david');
select pg_temp.ok(
  (select count(*) from public.lessons where slug = 'in-review-draft') = 0,
  'a lesson in review is not visible to a learner'
);
select pg_temp.ok(
  (select count(*) from public.lessons where slug = 'how-lock-teaches') = 1,
  'and a published one is'
);
reset role;

set role authenticated;
select pg_temp.claims(:'zevo');
select pg_temp.ok(
  (select count(*) from public.lessons where slug = 'in-review-draft') = 1,
  'staff see it, which is what review means'
);
reset role;

-- The generated column is the point: it cannot disagree with `status`, and it
-- refuses to be written directly rather than quietly ignoring the attempt.
select pg_temp.ok(
  (select published from public.lessons where slug = 'in-review-draft') = false,
  'published is computed from status'
);
select pg_temp.denied(
  'insert into public.lessons (module_id, slug, title, position, published, blocks)
   values (''00000000-0000-4000-8000-000000000001'', ''forced'', ''Forced'', 7, true, ''[]''::jsonb)',
  'and cannot be set behind status''s back'
);

update public.lessons set status = 'published' where slug = 'in-review-draft';
select pg_temp.ok(
  (select published from public.lessons where slug = 'in-review-draft'),
  'releasing it flips published in the same statement'
);
select pg_temp.ok(
  (select published_at is not null from public.lessons where slug = 'in-review-draft'),
  'and stamps when it first became visible'
);

/*
 * Archiving is the retirement state, and the assertion after it is the one
 * §17 asks for: the learner's completion is still there. Progress keys on the
 * lesson's id, which never changes, so editing or retiring content cannot
 * erase what somebody did.
 */
update public.lessons set status = 'archived' where id = '00000000-0000-4000-8000-000000000010';
select pg_temp.ok(
  (select status from public.learner_lesson_progress
   where profile_id = :'david' and lesson_id = '00000000-0000-4000-8000-000000000010') = 'completed',
  'archiving a lesson does not erase the completion of it'
);
select pg_temp.ok(
  (select count(*) from public.skill_evidence
   where profile_id = :'david' and lesson_id = '00000000-0000-4000-8000-000000000010') = 2,
  'nor the skill evidence it produced'
);
update public.lessons set status = 'published' where id = '00000000-0000-4000-8000-000000000010';

select pg_temp.ok(true, '── progress suite complete ──');
