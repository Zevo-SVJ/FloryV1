-- The learning system, tested.
--
-- The assertions that matter most are the two a learner would try if they
-- wanted a shortcut: forging a correct answer, and forging a completion.
--
-- Run with:  npm run test:db

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
    raise notice 'PASS  % [refused: %]', label, sqlerrm;
    return;
  end;
  if affected = 0 then raise notice 'PASS  % [no rows]', label;
  else raise exception 'FAIL  % [% row(s)]', label, affected; end if;
end;
$$;

create or replace function pg_temp.claims(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id::text)::text, false);
end;
$$;

\set david  '11111111-1111-1111-1111-111111111111'
\set other  '22222222-2222-2222-2222-222222222222'
\set mentor '33333333-3333-3333-3333-333333333333'

\set lesson1 '00000000-0000-4000-8000-000000000010'
\set lesson2 '00000000-0000-4000-8000-000000000011'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david',  'david@example.com',  '{"display_name":"David"}'::jsonb),
  (:'other',  'other@example.com',  '{}'::jsonb),
  (:'mentor', 'mentor@example.com', '{}'::jsonb);
update public.profiles set role = 'mentor' where id = :'mentor';

-- Staff access runs through an explicit assignment since the mentor layer
-- landed: `is_staff()` no longer means "may read every learner".
insert into public.learner_mentor_relationships (learner_id, mentor_id)
values (:'david', :'mentor');

-- ── Fixtures ────────────────────────────────────────────────────────────────
--
-- The engine's edge cases need lessons shaped to exercise them: one that
-- completes on a decision, one that completes on a knowledge check, one that is
-- not published at all. The real curriculum contains none of those shapes on
-- purpose — it never gates progression on a subjective answer — so the suite
-- builds its own rather than leaning on content that ships to a learner.
--
-- These rows are deleted from a real database by the curriculum migration. They
-- exist here, in the test, which is the only place they were ever needed.

insert into public.modules (id, phase_key, slug, title, summary, position, status)
values ('00000000-0000-4000-8000-000000000001', 'think', 'engine-fixtures',
        'Engine fixtures', 'Lessons that exist to exercise the engine.', 90,
        'published');

-- Completes on a decision, and carries one of every interactive block so the
-- grading paths can be reached.
insert into public.lessons (
  id, module_id, slug, title, summary, type, difficulty, estimated_minutes,
  objectives, completion_rule, position, status, is_demo, blocks
) values (
  :'lesson1', '00000000-0000-4000-8000-000000000001',
  'fixture-decision', 'A lesson that ends in a decision',
  'Exercises grading, reflection and decision completion.',
  'concept', 'foundational', 8,
  array['Reach every grading path in one lesson'],
  'decision', 1, 'published', true,
  $json$[
    {"kind":"text","id":"t1","text":"A fixture lesson. Its only reader is the test suite."},
    {"kind":"choice","id":"q-1","question":"Which of these is graded?",
     "multiple":false,
     "options":[{"id":"a","label":"A reflection"},{"id":"b","label":"A knowledge check"}],
     "correct":["b"],
     "explanation":"A reflection has no right answer; a knowledge check does, and the database decides it."},
    {"kind":"decision","id":"decide-1",
     "situation":"You can ship rough this weekend or polished in a month.",
     "options":[
       {"id":"rough","label":"Ship rough","tradeoff":"Evidence in days, a first impression you cannot retake."},
       {"id":"polished","label":"Ship polished","tradeoff":"Credible on day one, a month on unconfirmed assumptions."},
       {"id":"unsure","label":"I am not sure yet","tradeoff":"Fine, and there is a question that settles it: what would you learn this weekend?"}],
     "recommended":"rough",
     "explanation":"Ship rough, to a small chosen audience."},
    {"kind":"reflection","id":"reflect-1",
     "prompt":"Which of the two did you answer before reading on?"}
  ]$json$::jsonb
);

-- Completes on a knowledge check, and is locked behind the first.
insert into public.lessons (
  id, module_id, slug, title, summary, type, difficulty, estimated_minutes,
  objectives, completion_rule, position, status, is_demo, blocks
) values (
  :'lesson2', '00000000-0000-4000-8000-000000000001',
  'fixture-check', 'A lesson that ends in a check',
  'Exercises prerequisites and knowledge-check completion.',
  'teardown', 'foundational', 4,
  array['Reach the knowledge-check completion path'],
  'knowledge_check', 2, 'published', true,
  $json$[
    {"kind":"text","id":"t1","text":"Locked until the first fixture lesson is complete."},
    {"kind":"boolean","id":"q-tf",
     "question":"A lesson counts as complete once you have scrolled to the bottom.",
     "correct":["false"],
     "explanation":"Completion depends on the lesson's own rule, decided in the database rather than by the page."}
  ]$json$::jsonb
);

insert into public.lesson_prerequisites (lesson_id, requires_lesson_id)
values (:'lesson2', :'lesson1');

-- A draft nobody has published, to check the published gate.
insert into public.lessons (module_id, slug, title, position, status, is_demo, blocks)
values ('00000000-0000-4000-8000-000000000001', 'unpublished-draft', 'Draft', 9, 'draft', true, '[]'::jsonb);

-- ── The seed itself ─────────────────────────────────────────────────────────

select pg_temp.ok((select count(*) from public.phases) = 10, 'the ten phases are seeded');
select pg_temp.ok(
  (select key from public.phases order by position limit 1) = 'think',
  'phases keep the order the program has'
);
select pg_temp.ok(
  (select count(*) from public.lessons where not is_demo) > 40,
  'the real curriculum is seeded, not a demonstration of one'
);
select pg_temp.ok(
  (select count(distinct kind) from public.lessons l, jsonb_array_elements(l.blocks) b,
     lateral (select b->>'kind' as kind) k where not l.is_demo) >= 8,
  'and it uses the block vocabulary rather than a wall of prose'
);
select pg_temp.ok(
  (select count(*) from public.lessons where is_demo and status = 'published' and slug not like 'fixture-%') = 0,
  'no demonstration lesson is published to a learner'
);

-- ── Content is read-only to clients ─────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

select pg_temp.ok(
  (select count(*) from public.lessons where slug = 'unpublished-draft') = 0
    and (select count(*) from public.lessons where slug like 'fixture-%') = 2,
  'a learner sees published lessons and not drafts'
);
select pg_temp.ok(
  (select count(*) from public.phases) = 10,
  'a learner reads the phases'
);

select pg_temp.denied(
  format('update public.lessons set title = ''owned'' where id = %L', :'lesson1'),
  'a learner cannot edit lesson content'
);
select pg_temp.denied(
  'insert into public.lessons (module_id, slug, title, position) values ' ||
  '(''00000000-0000-4000-8000-000000000001'', ''forged'', ''Forged'', 42)',
  'a learner cannot author a lesson'
);
select pg_temp.denied(
  format('update public.lessons set blocks = ''[]''::jsonb where id = %L', :'lesson1'),
  'a learner cannot rewrite the answer key'
);

-- ── Grading cannot be forged ────────────────────────────────────────────────

-- The whole point of `record_block_response`: the verdict is computed, never
-- accepted from the caller.
select pg_temp.denied(
  format('insert into public.learner_block_responses (profile_id, lesson_id, block_id, response, is_correct) ' ||
         'values (%L, %L, ''q-1'', ''{"value":["a"]}''::jsonb, true)', :'david', :'lesson1'),
  'a learner cannot write a response row directly'
);

select pg_temp.ok(
  (public.record_block_response(:'lesson1', 'q-1', '{"value":["a"]}'::jsonb)).is_correct = false,
  'a wrong answer is graded wrong'
);
select pg_temp.ok(
  (public.record_block_response(:'lesson1', 'q-1', '{"value":["b"]}'::jsonb)).is_correct = true,
  'the right answer is graded right'
);
select pg_temp.ok(
  (select attempts from public.learner_block_responses
    where profile_id = :'david' and block_id = 'q-1') = 2,
  'attempts are counted'
);
select pg_temp.ok(
  (public.record_block_response(:'lesson1', 'reflect-1', '{"value":"I read both reveals first."}'::jsonb)).is_correct is null,
  'a reflection has no right answer, and that is a third state rather than a failure'
);
select pg_temp.denied(
  format('select public.record_block_response(%L, ''no-such-block'', ''{}''::jsonb)', :'lesson1'),
  'a response to a block that does not exist is refused'
);

select pg_temp.ok(
  (select status from public.learner_lesson_progress
    where profile_id = :'david' and lesson_id = :'lesson1') = 'in_progress',
  'answering anything starts the lesson'
);

-- ── Completion cannot be forged ─────────────────────────────────────────────

select pg_temp.denied(
  format('update public.learner_lesson_progress set status = ''completed'' ' ||
         'where profile_id = %L and lesson_id = %L', :'david', :'lesson1'),
  'a learner cannot mark themselves complete'
);
select pg_temp.denied(
  format('update public.learner_lesson_progress set completed_at = now() ' ||
         'where profile_id = %L and lesson_id = %L', :'david', :'lesson1'),
  'nor backdate a completion'
);

-- Lesson 1 completes on a decision, and none has been recorded yet.
select pg_temp.denied(
  format('select public.complete_lesson(%L)', :'lesson1'),
  'a decision lesson will not complete without a decision'
);

select pg_temp.ok(
  (public.record_block_response(:'lesson1', 'decide-1', '{"value":"rough"}'::jsonb)).is_correct is null,
  'a decision is recorded without being marked right or wrong'
);
select pg_temp.ok(
  (public.complete_lesson(:'lesson1')).status = 'completed',
  'the lesson completes once the decision exists'
);
select pg_temp.ok(
  (select completed_at is not null from public.learner_lesson_progress
    where profile_id = :'david' and lesson_id = :'lesson1'),
  'completion is timestamped by the database'
);

-- Lesson 2 completes on a knowledge check.
select pg_temp.denied(
  format('select public.complete_lesson(%L)', :'lesson2'),
  'a knowledge-check lesson will not complete unanswered'
);
select pg_temp.ok(
  (public.record_block_response(:'lesson2', 'q-tf', '{"value":["true"]}'::jsonb)).is_correct = false,
  'the wrong answer to the check is wrong'
);
select pg_temp.denied(
  format('select public.complete_lesson(%L)', :'lesson2'),
  'nor with the check answered wrongly'
);
select pg_temp.ok(
  (public.record_block_response(:'lesson2', 'q-tf', '{"value":["false"]}'::jsonb)).is_correct = true,
  'and right when it is right'
);
select pg_temp.ok(
  (public.complete_lesson(:'lesson2')).status = 'completed',
  'the check being passed completes the lesson'
);

-- ── What a learner may write for themselves ─────────────────────────────────

update public.learner_lesson_progress set confidence = 'revisit', last_block_id = 'h2'
where profile_id = :'david' and lesson_id = :'lesson1';
select pg_temp.ok(
  (select confidence from public.learner_lesson_progress
    where profile_id = :'david' and lesson_id = :'lesson1') = 'revisit',
  'a learner sets their own confidence and reading position'
);

insert into public.learner_lesson_notes (profile_id, lesson_id, body)
values (:'david', :'lesson1', 'The decision exercise was the part I skipped.');
select pg_temp.ok(
  (select count(*) from public.learner_lesson_notes where profile_id = :'david') = 1,
  'a learner keeps notes'
);

reset role;

-- ── One learner cannot reach another ────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'other');

select pg_temp.ok(
  (select count(*) from public.learner_lesson_progress) = 0,
  'another learner sees none of David''s progress'
);
select pg_temp.ok(
  (select count(*) from public.learner_block_responses) = 0,
  'nor his answers'
);
select pg_temp.ok(
  (select count(*) from public.learner_lesson_notes) = 0,
  'nor his notes'
);
select pg_temp.denied(
  format('insert into public.learner_lesson_progress (profile_id, lesson_id) values (%L, %L)',
         :'david', :'lesson1'),
  'nor start a lesson on his behalf'
);
select pg_temp.denied(
  format('delete from public.learner_lesson_notes where profile_id = %L', :'david'),
  'nor delete his notes'
);

reset role;

-- ── Staff see work, but not private thinking ────────────────────────────────

set role authenticated;
select pg_temp.claims(:'mentor');

select pg_temp.ok(
  (select count(*) from public.learner_lesson_progress) = 2,
  'a mentor reads a learner''s progress, because reviewing work means seeing it'
);
select pg_temp.ok(
  (select count(*) from public.learner_block_responses) > 0,
  'and their answers'
);
select pg_temp.ok(
  (select count(*) from public.learner_lesson_notes) = 0,
  'but not their notes — a note is thinking out loud, not submitted work'
);
select pg_temp.ok(
  (select count(*) from public.lessons where slug = 'unpublished-draft') = 1,
  'staff see unpublished drafts'
);

reset role;

-- And an unassigned mentor reaches none of it. `other` is promoted here, as
-- the owner, because a learner cannot promote anybody — including themselves.
update public.profiles set role = 'mentor' where id = :'other';

set role authenticated;
select pg_temp.claims(:'other');

select pg_temp.ok(
  (select count(*) from public.learner_lesson_progress) = 0,
  'a mentor with no assignment reads no progress'
);
select pg_temp.ok(
  (select count(*) from public.learner_block_responses) = 0,
  'nor any answers'
);

reset role;

-- ── Constraints worth having ────────────────────────────────────────────────

select pg_temp.denied(
  'insert into public.lesson_prerequisites (lesson_id, requires_lesson_id) values ' ||
  format('(%L, %L)', :'lesson1', :'lesson1'),
  'a lesson cannot require itself'
);
select pg_temp.denied(
  format('insert into public.lessons (module_id, slug, title, position, blocks) values ' ||
         '(%L, ''bad-blocks'', ''Bad'', 77, ''[{"kind":"text"}]''::jsonb)',
         '00000000-0000-4000-8000-000000000001'),
  'a block with no id is refused, because responses are keyed on it'
);
select pg_temp.denied(
  format('insert into public.lesson_resources (lesson_id, kind, title, url, why) values ' ||
         '(%L, ''video'', ''X'', ''https://e.com'', ''too short'')', :'lesson1'),
  'a resource with no real reason attached is refused'
);

select pg_temp.ok(true, '── learning system suite complete ──');
