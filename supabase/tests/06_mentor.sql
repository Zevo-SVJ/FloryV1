-- The mentor layer, tested.
--
-- Section 31 of the brief asks for these explicitly, so they lead: a learner
-- must never approve their own artifact, mark it final, forge feedback, alter a
-- review, or read a mentor's private notes. Each is attempted below.

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

\set david   '11111111-1111-1111-1111-111111111111'
\set stranger '22222222-2222-2222-2222-222222222222'
\set zevo    '33333333-3333-3333-3333-333333333333'
\set other_mentor '44444444-4444-4444-4444-444444444444'
\set boss    '55555555-5555-5555-5555-555555555555'
\set mission '00000000-0000-4000-8000-000000000100'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david',        'david@example.com',  '{"display_name":"David"}'::jsonb),
  (:'stranger',     'other@example.com',  '{}'::jsonb),
  (:'zevo',         'zevo@example.com',   '{"display_name":"Zevo"}'::jsonb),
  (:'other_mentor', 'nm@example.com',     '{}'::jsonb),
  (:'boss',         'admin@example.com',  '{}'::jsonb);

update public.profiles set role = 'mentor' where id in (:'zevo', :'other_mentor');
update public.profiles set role = 'admin'  where id = :'boss';

insert into public.learner_mentor_relationships (learner_id, mentor_id)
values (:'david', :'zevo');

-- A mission that needs a human verdict. It belongs to the test rather than to
-- the curriculum: review is a property this suite has to control, and a real
-- mission's settings are an editorial decision that should not break security
-- assertions when it changes.
insert into public.missions (
  id, phase_key, slug, title, type, objective, deliverable_title,
  requires_review, requires_reflection, position, status, is_demo
) values (
  '00000000-0000-4000-8000-000000000300', 'validate', 'fixture-validate-the-problem',
  'Validate the problem', 'research', 'Get evidence before you get a codebase.',
  'Validation Report', true, false, 90, 'published', true
);

-- David does the work.
insert into public.projects (id, profile_id, name, slug)
values ('00000000-0000-4000-8000-000000000400', :'david', 'Ledgerly', 'ledgerly');

insert into public.artifacts (id, project_id, profile_id, mission_id, title, content)
values (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000400', :'david',
  '00000000-0000-4000-8000-000000000300',
  'Validation Report', 'Four of six had built a spreadsheet for it.'
);

-- ── A learner cannot decide their own work is good ──────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

select pg_temp.ok(
  (public.submit_artifact('00000000-0000-4000-8000-000000000401')).status = 'submitted',
  'the learner submits'
);
/*
 * Narrowed by kind rather than by total, since Prompt 7. Submitting now also
 * earns milestones, and a milestone notification *is* addressed to the learner.
 * What must never reach them is the submission notice itself — that one is for
 * the mentor, and a learner seeing it would mean the RLS policy leaked.
 */
select pg_temp.ok(
  (select count(*) from public.notifications where kind = 'artifact_submitted') = 0,
  'and is not notified about their own submission'
);

select pg_temp.denied(
  'update public.artifacts set status = ''approved'' where title = ''Validation Report''',
  'a learner cannot approve their own artifact'
);
select pg_temp.denied(
  'update public.artifacts set status = ''final'' where title = ''Validation Report''',
  'nor mark it final'
);
select pg_temp.denied(
  format('select public.review_artifact(%L, ''approved'')', '00000000-0000-4000-8000-000000000401'),
  'nor call the review function'
);
select pg_temp.denied(
  'insert into public.artifact_feedback (artifact_id, reviewer_id, status, what_needs_work, next_step) values ' ||
  format('(%L, %L, ''approved'', ''x'', ''y'')', '00000000-0000-4000-8000-000000000401', :'david'),
  'nor forge a review row'
);

-- The mission needs approval, and none exists.
select pg_temp.denied(
  format('select public.complete_mission(%L)', '00000000-0000-4000-8000-000000000300'),
  'a mission requiring review will not complete without it'
);

-- A question is asked, not answered.
insert into public.mentor_questions (learner_id, project_id, mission_id, question)
values (:'david', '00000000-0000-4000-8000-000000000400',
        '00000000-0000-4000-8000-000000000300',
        'Is four out of six enough evidence, or am I stopping too early?');

select pg_temp.denied(
  'update public.mentor_questions set response = ''Yes, plenty.'', status = ''answered''',
  'a learner cannot answer their own question'
);
select pg_temp.denied(
  'select public.answer_question((select id from public.mentor_questions), ''Yes, that is plenty of evidence.'')',
  'nor through the function'
);

select pg_temp.ok(
  (select count(*) from public.mentor_notes) = 0,
  'a learner sees no mentor notes at all'
);

reset role;

-- Zevo leaves a private note before reviewing.
set role authenticated;
select pg_temp.claims(:'zevo');

insert into public.mentor_notes (learner_id, author_id, body)
values (:'david', :'zevo', 'Strong instinct, but stops gathering evidence one conversation early.');

reset role;

set role authenticated;
select pg_temp.claims(:'david');
select pg_temp.ok(
  (select count(*) from public.mentor_notes) = 0,
  'and still sees none once one exists — the note is why it stays honest'
);
reset role;

-- ── A mentor reviews, and only their own learners ───────────────────────────

set role authenticated;
select pg_temp.claims(:'other_mentor');

select pg_temp.ok(
  (select count(*) from public.artifacts) = 0,
  'an unassigned mentor sees none of David''s work'
);
select pg_temp.ok(
  (select count(*) from public.projects) = 0,
  'nor his project'
);
select pg_temp.ok(
  (select count(*) from public.mentor_notes) = 0,
  'nor another mentor''s notes about him'
);
select pg_temp.denied(
  format('select public.review_artifact(%L, ''approved'')', '00000000-0000-4000-8000-000000000401'),
  'nor may they review him'
);

reset role;

set role authenticated;
select pg_temp.claims(:'zevo');

select pg_temp.ok(
  (select count(*) from public.artifacts) = 1,
  'the assigned mentor sees the submission'
);
select pg_temp.ok(
  (select count(*) from public.notifications where profile_id = :'zevo') = 1,
  'and was notified when it arrived'
);

-- A rejection has to be actionable.
select pg_temp.denied(
  format('select public.review_artifact(%L, ''needs_work'', ''Good start.'', '''', '''', '''')',
         '00000000-0000-4000-8000-000000000401'),
  'a rejection with nothing to act on is refused'
);

select pg_temp.ok(
  (public.review_artifact(
     '00000000-0000-4000-8000-000000000401', 'needs_work',
     'The quotes are real and specific.',
     'Six conversations is thin for a problem this expensive to get wrong.',
     'A wrong read here costs a month of building.',
     'Talk to four more, and ask what they paid to avoid it.',
     'research')).status = 'needs_work',
  'a mentor returns work with something to act on'
);
select pg_temp.ok(
  (select status from public.artifacts where id = '00000000-0000-4000-8000-000000000401') = 'needs_work',
  'and the artifact status follows the verdict'
);
select pg_temp.ok(
  (select count(*) from public.build_log_entries where is_automatic) = 2,
  'the review writes the build log itself'
);
-- Written by a definer function, so it exists — but a mentor cannot read a
-- learner's notifications, which is the correct answer to this query here.
select pg_temp.ok(
  (select count(*) from public.notifications where profile_id = :'david') = 0,
  'and a mentor cannot read the learner''s own notifications'
);

select pg_temp.ok(
  (public.answer_question(
     (select id from public.mentor_questions),
     'What would change your mind if the next four disagreed? Answer that first.')).status = 'answered',
  'a mentor answers the question'
);
select pg_temp.denied(
  'select public.answer_question((select id from public.mentor_questions), ''ok'')',
  'an answer that says nothing is refused'
);

reset role;

-- ── The learner improves and resubmits; history survives ────────────────────

set role authenticated;
select pg_temp.claims(:'david');

/*
 * Two mentor notices by now: the review came back, and the question was
 * answered. Counted by kind rather than in total, because Prompt 7 added
 * milestone notices to the same table and this assertion is about the mentor
 * layer telling the learner what a human did.
 */
select pg_temp.ok(
  (select count(*) from public.notifications
   where kind in ('artifact_reviewed', 'question_answered')) = 2,
  'the learner was told their work came back, and that their question was answered'
);
select pg_temp.ok(
  (select count(*) from public.notifications where kind = 'artifact_reviewed') = 1,
  'and each says what happened rather than that something happened'
);
select pg_temp.ok(
  (select count(*) from public.artifact_feedback) = 1,
  'the learner reads the feedback on their own work'
);
select pg_temp.ok(
  (select what_needs_work from public.artifact_feedback) like 'Six conversations%',
  'and it is the structured version, not a shrug'
);
select pg_temp.denied(
  'update public.artifact_feedback set status = ''approved''',
  'a learner cannot alter a review'
);
select pg_temp.denied(
  'delete from public.artifact_feedback',
  'nor delete one'
);

update public.artifacts
set content = 'Ten conversations. Four had built spreadsheets; two pay a bookkeeper.'
where id = '00000000-0000-4000-8000-000000000401';

select pg_temp.ok(
  (public.submit_artifact('00000000-0000-4000-8000-000000000401')).status = 'submitted',
  'and resubmits'
);

reset role;

set role authenticated;
select pg_temp.claims(:'zevo');
select pg_temp.ok(
  (public.review_artifact(
     '00000000-0000-4000-8000-000000000401', 'approved',
     'Ten conversations, and you asked what they paid.', '', '', '', 'research')).status = 'approved',
  'the mentor approves the second time'
);
reset role;

set role authenticated;
select pg_temp.claims(:'david');

select pg_temp.ok(
  (select count(*) from public.artifact_feedback) = 2,
  'both reviews survive — "you submitted this twice" is the useful part'
);
select pg_temp.ok(
  (select status from public.artifact_feedback order by created_at limit 1) = 'needs_work',
  'and the first verdict was not overwritten'
);
select pg_temp.ok(
  (public.complete_mission('00000000-0000-4000-8000-000000000300')).status = 'completed',
  'the mission completes now that a human approved it'
);

reset role;

-- ── An admin reaches everything; a stranger reaches nothing ─────────────────

set role authenticated;
select pg_temp.claims(:'boss');
select pg_temp.ok((select count(*) from public.artifacts) = 1, 'an admin sees the work without an assignment');
select pg_temp.ok((select count(*) from public.mentor_notes) = 1, 'and the mentor notes');
reset role;

set role authenticated;
select pg_temp.claims(:'stranger');
select pg_temp.ok((select count(*) from public.artifacts) = 0, 'a stranger sees no artifacts');
select pg_temp.ok((select count(*) from public.artifact_feedback) = 0, 'no feedback');
select pg_temp.ok((select count(*) from public.mentor_questions) = 0, 'no questions');
select pg_temp.ok((select count(*) from public.notifications) = 0, 'no notifications');
select pg_temp.denied(
  format('select public.review_artifact(%L, ''approved'')', '00000000-0000-4000-8000-000000000401'),
  'and cannot review'
);
select pg_temp.denied(
  format('insert into public.mentor_notes (learner_id, author_id, body) values (%L, %L, ''hello there'')',
         :'david', :'stranger'),
  'nor write a note about somebody'
);
reset role;

-- ── An admin who is also the author cannot review themselves ────────────────

insert into public.projects (id, profile_id, name, slug)
values ('00000000-0000-4000-8000-000000000500', :'boss', 'Admin project', 'admin-project');
insert into public.artifacts (id, project_id, profile_id, title, content, status)
values ('00000000-0000-4000-8000-000000000501',
        '00000000-0000-4000-8000-000000000500', :'boss', 'Own work', 'x', 'submitted');

set role authenticated;
select pg_temp.claims(:'boss');
select pg_temp.denied(
  format('select public.review_artifact(%L, ''approved'')', '00000000-0000-4000-8000-000000000501'),
  'not even an admin may approve their own work'
);
reset role;

select pg_temp.ok(true, '── mentor suite complete ──');
