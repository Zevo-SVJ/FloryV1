-- Missions and the workspace, tested.
--
-- As with the learning system, the assertions that matter are the shortcuts:
-- submitting nothing, submitting without the evidence a mission demands, and
-- completing a mission that was never submitted.

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

\set david  '11111111-1111-1111-1111-111111111111'
\set other  '22222222-2222-2222-2222-222222222222'
\set mentor '33333333-3333-3333-3333-333333333333'
\set mission '00000000-0000-4000-8000-000000000100'
\set lesson1 '00000000-0000-4000-8000-000000000010'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david',  'david@example.com',  '{"display_name":"David"}'::jsonb),
  (:'other',  'other@example.com',  '{}'::jsonb),
  (:'mentor', 'mentor@example.com', '{}'::jsonb);
update public.profiles set role = 'mentor' where id = :'mentor';

-- Reviewing requires an assignment, not merely the mentor role.
insert into public.learner_mentor_relationships (learner_id, mentor_id)
values (:'david', :'mentor');

-- A mission that demands proof, to exercise the evidence gate.
insert into public.missions (
  id, phase_key, slug, title, type, objective, deliverable_title,
  required_evidence, requires_reflection, position, published, is_demo
) values (
  '00000000-0000-4000-8000-000000000200', 'ship', 'ship-it', 'Ship it', 'deploy',
  'Put it in front of real people.', 'Ship Report',
  '{deployment,repository}', false, 1, true, true
);

select pg_temp.ok(
  (select count(*) from public.missions where is_demo) = 2,
  'demo missions are flagged so they can be deleted in one statement'
);

set role authenticated;
select pg_temp.claims(:'david');

-- ── The project ─────────────────────────────────────────────────────────────

insert into public.projects (profile_id, name, slug, description)
values (:'david', 'Ledgerly', 'ledgerly', 'Invoice reconciliation for agencies.');

select pg_temp.ok(
  (select status from public.projects where slug = 'ledgerly') = 'idea',
  'a new project starts as an idea'
);
select pg_temp.denied(
  format('insert into public.projects (profile_id, name, slug) values (%L, ''Theirs'', ''theirs'')', :'other'),
  'a learner cannot create a project for somebody else'
);

-- ── The artifact ────────────────────────────────────────────────────────────

insert into public.artifacts (project_id, profile_id, mission_id, title, content)
values (
  (select id from public.projects where slug = 'ledgerly'),
  :'david', :'mission', 'Idea Brief', ''
);

select pg_temp.ok(
  (select status from public.artifacts where title = 'Idea Brief') = 'draft',
  'work starts as a draft, not as something finished'
);

select pg_temp.denied(
  'update public.artifacts set status = ''approved'' where title = ''Idea Brief''',
  'a learner cannot approve their own work'
);
select pg_temp.denied(
  'update public.artifacts set status = ''submitted'' where title = ''Idea Brief''',
  'nor mark it submitted directly'
);
select pg_temp.denied(
  'update public.artifacts set submitted_at = now() where title = ''Idea Brief''',
  'nor backdate a submission'
);

-- Empty work is not submittable.
select pg_temp.denied(
  format('select public.submit_artifact((select id from public.artifacts where title = %L))', 'Idea Brief'),
  'an empty deliverable cannot be submitted'
);

update public.artifacts
set content = 'Agency owners lose two hours a week reconciling invoices across three tools.'
where title = 'Idea Brief';

select pg_temp.ok(
  (public.submit_artifact((select id from public.artifacts where title = 'Idea Brief'))).status = 'submitted',
  'a deliverable with something in it can be submitted'
);
select pg_temp.ok(
  (select count(*) from public.build_log_entries where is_automatic) = 1,
  'submitting writes the build log entry itself'
);

-- ── Completion ──────────────────────────────────────────────────────────────

select pg_temp.denied(
  format('update public.learner_mission_progress set status = ''completed'' where mission_id = %L', :'mission'),
  'a learner cannot mark a mission complete'
);

-- This mission requires a reflection.
select pg_temp.denied(
  format('select public.complete_mission(%L)', :'mission'),
  'a mission that asks for a reflection will not complete without one'
);

select pg_temp.ok(
  (public.complete_mission(:'mission', 'I had been describing a market, not a person.')).status = 'completed',
  'the mission completes with the reflection'
);
select pg_temp.ok(
  (select count(*) from public.build_log_entries) = 2,
  'completing writes a second entry'
);

-- ── Evidence is enforced where a mission demands it ─────────────────────────

insert into public.artifacts (project_id, profile_id, mission_id, title, content)
values (
  (select id from public.projects where slug = 'ledgerly'),
  :'david', '00000000-0000-4000-8000-000000000200', 'Ship Report', 'It is live.'
);

select pg_temp.denied(
  'select public.submit_artifact((select id from public.artifacts where title = ''Ship Report''))',
  'a ship report cannot be submitted without the deployment it claims'
);

insert into public.evidence (artifact_id, kind, url, label)
values ((select id from public.artifacts where title = 'Ship Report'),
        'deployment', 'https://ledgerly.example', 'Production');

select pg_temp.denied(
  'select public.submit_artifact((select id from public.artifacts where title = ''Ship Report''))',
  'nor with only half the evidence it asks for'
);

insert into public.evidence (artifact_id, kind, url, label)
values ((select id from public.artifacts where title = 'Ship Report'),
        'repository', 'https://github.com/example/ledgerly', 'Source');

select pg_temp.ok(
  (public.submit_artifact((select id from public.artifacts where title = 'Ship Report'))).status = 'submitted',
  'and goes through once every required kind is attached'
);

select pg_temp.denied(
  'insert into public.evidence (artifact_id, kind, label) values ' ||
  '((select id from public.artifacts where title = ''Ship Report''), ''deployment'', ''No link'')',
  'a deployment with no URL is not evidence'
);
select pg_temp.denied(
  'insert into public.evidence (artifact_id, kind, note) values ' ||
  '((select id from public.artifacts where title = ''Ship Report''), ''note'', ''short'')',
  'nor is a note that says nothing'
);

reset role;

-- ── Isolation ───────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'other');

select pg_temp.ok((select count(*) from public.projects) = 0, 'another learner sees no projects but their own');
select pg_temp.ok((select count(*) from public.artifacts) = 0, 'nor their artifacts');
select pg_temp.ok((select count(*) from public.evidence) = 0, 'nor their evidence');
select pg_temp.ok((select count(*) from public.build_log_entries) = 0, 'nor their build log');
select pg_temp.denied(
  'update public.artifacts set content = ''owned''',
  'nor edit their work'
);
select pg_temp.denied(
  'select public.submit_artifact((select id from public.artifacts))',
  'nor submit on their behalf'
);

reset role;

-- ── Staff read the work, and cannot do it ───────────────────────────────────

set role authenticated;
select pg_temp.claims(:'mentor');

select pg_temp.ok((select count(*) from public.projects) = 1, 'a mentor reads the project');
select pg_temp.ok((select count(*) from public.artifacts) = 2, 'and the artifacts');
select pg_temp.ok((select count(*) from public.evidence) = 2, 'and the evidence');
select pg_temp.denied(
  'update public.artifacts set content = ''fixed for you''',
  'a mentor cannot do the mission for the learner'
);
select pg_temp.denied(
  'insert into public.artifact_feedback (artifact_id, reviewer_id, status) values ' ||
  format('((select id from public.artifacts limit 1), %L, ''approved'')', :'mentor'),
  'and cannot write feedback directly — review_artifact() is the only path'
);

reset role;

-- ── Constraints ─────────────────────────────────────────────────────────────

select pg_temp.denied(
  format('insert into public.mission_prerequisites values (%L, %L)', :'mission', :'mission'),
  'a mission cannot require itself'
);
select pg_temp.denied(
  'insert into public.artifact_feedback (artifact_id, reviewer_id, status) values ' ||
  format('((select id from public.artifacts limit 1), %L, ''draft'')', :'mentor'),
  'a review verdict must be a verdict, not a draft'
);

select pg_temp.ok(true, '── missions and workspace suite complete ──');
