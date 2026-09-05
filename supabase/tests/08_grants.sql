-- Column privileges, tested as attacks.
--
-- This suite exists because of what an audit in Prompt 8 found: `grant insert
-- on <table>` had been used where `grant insert (cols)` was meant, and the
-- difference was invisible. Row Level Security was correct throughout and did
-- not help — every forgery below is a row the learner legitimately owns, and
-- RLS decides which rows rather than which columns.
--
-- Three of these were live and were demonstrated against a running instance
-- before being closed. They are kept here so that widening a grant again fails
-- the build instead of shipping.

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

\set david '11111111-1111-1111-1111-111111111111'
\set zevo  '33333333-3333-3333-3333-333333333333'
\set proj  '00000000-0000-4000-8000-000000000800'
\set mis   '00000000-0000-4000-8000-000000000801'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david', 'david@example.com', '{"display_name":"David"}'::jsonb),
  (:'zevo',  'zevo@example.com',  '{"display_name":"Zevo"}'::jsonb);
update public.profiles set role = 'mentor' where id = :'zevo';
insert into public.learner_mentor_relationships (learner_id, mentor_id) values (:'david', :'zevo');

insert into public.missions (
  id, phase_key, slug, title, type, objective, deliverable_title,
  requires_review, position, status, is_demo
) values (
  :'mis', 'validate', 'grant-suite-mission', 'Grant suite mission', 'research',
  'Exists so the suite has something to attach work to.', 'Report', true, 5, 'published', true
);

insert into public.projects (id, profile_id, name, slug)
values (:'proj', :'david', 'Ledgerly', 'ledgerly');

-- ────────────────────────────────────────────────────────────────────────────
-- The three that were live
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

/*
 * The worst of them. Inserting an artifact that is *already* approved skips
 * `review_artifact()` entirely — so the self-approval check never runs, the
 * mission's `requires_review` gate opens, and `milestone_is_met(
 * 'artifacts_approved')` turns true, paying out XP and a milestone.
 */
select pg_temp.denied(
  format('insert into public.artifacts (project_id, profile_id, mission_id, title, content, status)
          values (%L, %L, %L, ''Forged'', ''x'', ''approved'')', :'proj', :'david', :'mis'),
  'a learner cannot insert an artifact that is already approved'
);
select pg_temp.denied(
  format('insert into public.artifacts (project_id, profile_id, title, content, submitted_at)
          values (%L, %L, ''Forged'', ''x'', now())', :'proj', :'david'),
  'nor backdate a submission'
);

-- A mission finished without an artifact, evidence or a reflection.
select pg_temp.denied(
  format('insert into public.learner_mission_progress (profile_id, mission_id, status, completed_at)
          values (%L, %L, ''completed'', now())', :'david', :'mis'),
  'a learner cannot insert a completed mission'
);

-- Their mentor's answer, in their mentor's name.
select pg_temp.denied(
  format('insert into public.mentor_questions (learner_id, question, response, status)
          values (%L, ''Good?'', ''Yes, ship it.'', ''answered'')', :'david'),
  'a learner cannot write their own mentor''s answer'
);
select pg_temp.denied(
  format('insert into public.mentor_questions (learner_id, question, mentor_id)
          values (%L, ''Good?'', %L)', :'david', :'zevo'),
  'nor decide who answered it'
);

/*
 * `is_automatic` separates what the system wrote from what the learner wrote,
 * and the mentor reads that log. A forged "Approved: …" line is a lie told to
 * the one person whose judgement the platform exists to carry.
 */
select pg_temp.denied(
  format('insert into public.build_log_entries (project_id, profile_id, title, is_automatic)
          values (%L, %L, ''Approved by mentor'', true)', :'proj', :'david'),
  'a learner cannot forge a system-written build log entry'
);

-- Project state is earned by living with the product, not claimed at creation.
select pg_temp.denied(
  format('insert into public.projects (profile_id, name, slug, status)
          values (%L, ''Second'', ''second'', ''live'')', :'david'),
  'a learner cannot create a project that is already live'
);

-- ────────────────────────────────────────────────────────────────────────────
-- The honest paths still work
-- ────────────────────────────────────────────────────────────────────────────

-- Each of these is the exact shape `src/types/database.ts` declares, so this
-- half of the suite is what stops the fix from being "revoke everything".
insert into public.artifacts (project_id, profile_id, mission_id, title, description, content, url)
values (:'proj', :'david', :'mis', 'Honest work', 'A real deliverable.', 'Real content.', 'https://example.com');

select pg_temp.ok(
  (select status from public.artifacts where title = 'Honest work') = 'draft',
  'an artifact a learner creates starts as a draft, whatever they sent'
);

insert into public.evidence (artifact_id, kind, url, label, note)
select id, 'deployment', 'https://ledgerly.example', 'Production', ''
from public.artifacts where title = 'Honest work';
select pg_temp.ok((select count(*) from public.evidence) = 1, 'evidence still attaches');

insert into public.learner_mission_progress (profile_id, mission_id, project_id)
values (:'david', :'mis', :'proj');
select pg_temp.ok(
  (select status from public.learner_mission_progress) = 'in_progress',
  'starting a mission still works, and starts it in progress'
);

insert into public.mentor_questions (learner_id, question) values (:'david', 'A real question?');
select pg_temp.ok(
  (select status from public.mentor_questions) = 'open'
    and (select response from public.mentor_questions) = '',
  'asking still works, and the answer is empty until a mentor writes one'
);

insert into public.build_log_entries (project_id, profile_id, title, detail)
values (:'proj', :'david', 'My own note', 'Thinking out loud.');
select pg_temp.ok(
  (select is_automatic from public.build_log_entries where title = 'My own note') = false,
  'a learner''s own entry is marked as theirs, whatever they sent'
);

reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- The rule, as a rule
-- ────────────────────────────────────────────────────────────────────────────

/*
 * The generalisation, as a list of columns rather than a shape.
 *
 * The first version of this assertion said "no table may grant insert on all of
 * its columns", which is a proxy and a bad one: `learner_recent_items` has
 * three columns and a learner may legitimately write all three. What actually
 * matters is narrower and can be named — the columns that carry authority.
 * Every one of these decides something the learner is not entitled to decide,
 * and none may be writable by a client at any role, through insert or update.
 */
select pg_temp.ok(
  not exists (
    select 1
    from (values
      -- Work is judged by somebody else, and the timestamps are the record.
      ('artifacts', 'status'), ('artifacts', 'submitted_at'),
      -- Completion is earned through `complete_mission()`.
      ('learner_mission_progress', 'status'),
      ('learner_mission_progress', 'completed_at'),
      ('learner_mission_progress', 'submitted_at'),
      -- Lesson completion is earned through `complete_lesson()`.
      ('learner_lesson_progress', 'status'), ('learner_lesson_progress', 'completed_at'),
      -- The verdict on an answer is computed, never supplied.
      ('learner_block_responses', 'is_correct'), ('learner_block_responses', 'attempts'),
      -- The mentor's words, and who is said to have spoken them.
      ('mentor_questions', 'response'), ('mentor_questions', 'answered_at'),
      ('mentor_questions', 'status'), ('mentor_questions', 'mentor_id'),
      -- What the system wrote, as opposed to what the learner wrote.
      ('build_log_entries', 'is_automatic'),
      -- A review is a fact about a person other than its subject.
      ('artifact_feedback', 'status'), ('artifact_feedback', 'reviewer_id'),
      -- Progress is generated by the events that earn it.
      ('xp_events', 'amount'), ('xp_events', 'kind'),
      ('learner_milestones', 'earned_at'), ('learner_milestones', 'awarded_by'),
      ('skill_evidence', 'kind'),
      -- The authorization fact itself. True since the foundation migration.
      ('profiles', 'role')
    ) as guarded(tbl, col)
    join information_schema.column_privileges cp
      on cp.table_schema = 'public'
     and cp.table_name = guarded.tbl
     and cp.column_name = guarded.col
     and cp.grantee in ('authenticated', 'anon')
     and cp.privilege_type in ('INSERT', 'UPDATE')
  ),
  'no column that carries authority is writable by a client'
);

select pg_temp.ok(true, '── grants suite complete ──');
