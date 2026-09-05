-- Creating a project, and the trigger that used to destroy it.
--
-- The bug this suite exists for: naming your product failed with "That did not
-- save. Try again.", for every valid input, on any database where one enum
-- value from `20260910000000_progress_skills.sql` had not taken effect. The
-- insert was never at fault. An AFTER INSERT trigger awarding FIRST IDEA wrote
-- a notification whose `kind` did not exist, raised, and took the learner's
-- product down with it in the same transaction.
--
-- Two things are asserted here, and the second is the one that matters:
--
--   1. The enum value exists.
--   2. Even if the awards path is broken for some *other* reason, the project
--      still persists. Bookkeeping may not veto the work it records.

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

create or replace function pg_temp.ok(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end;
$$;

create or replace function pg_temp.claims(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id::text)::text, false);
end;
$$;

\set david '11111111-1111-1111-1111-111111111111'
\set rival '22222222-2222-2222-2222-222222222222'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'david', 'david@example.com', '{"display_name":"David"}'::jsonb),
  (:'rival', 'rival@example.com', '{"display_name":"Rival"}'::jsonb);

set client_min_messages = notice;

-- ────────────────────────────────────────────────────────────────────────────
-- The enum value the trigger needs
-- ────────────────────────────────────────────────────────────────────────────

select pg_temp.ok(
  exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'notification_kind' and e.enumlabel = 'milestone_earned'
  ),
  'notification_kind carries milestone_earned'
);

-- ────────────────────────────────────────────────────────────────────────────
-- The happy path, through exactly the grant the learner holds
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'david');

-- The four columns the application names, and no others.
insert into public.projects (profile_id, name, slug, description)
values (:'david', 'Ledgerly', 'ledgerly', 'Invoicing for freelancers.');

select pg_temp.ok(
  (select count(*) from public.projects where slug = 'ledgerly') = 1,
  'a learner can create their project'
);
select pg_temp.ok(
  (select status from public.projects where slug = 'ledgerly') = 'idea',
  'and it starts as an idea, set by the database rather than the client'
);

-- The awards the trigger is supposed to hand out actually arrived.
select pg_temp.ok(
  (select count(*) from public.xp_events
    where profile_id = :'david' and kind = 'project_started') = 1,
  'starting a project is still worth XP'
);
select pg_temp.ok(
  (select count(*) from public.learner_milestones
    where profile_id = :'david' and milestone_key = 'first-idea') = 1,
  'FIRST IDEA is still awarded'
);
select pg_temp.ok(
  (select count(*) from public.notifications
    where profile_id = :'david' and kind = 'milestone_earned') = 1,
  'and the learner is still told about it'
);

-- Reading it back is what the interface does after the redirect.
select pg_temp.ok(
  (select name from public.projects where profile_id = :'david') = 'Ledgerly',
  'the project reads back for its owner — refresh keeps it'
);
reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- The regression itself: a broken awards path must not cost a project
-- ────────────────────────────────────────────────────────────────────────────

/*
 * A real fault is forced inside the awards chain rather than simulated with a
 * mock, because the bug was that a real fault propagated. Any error will do —
 * the enum was one instance of a class.
 */
-- `not valid` so the rows already written above are left alone; new inserts are
-- still checked, which is the half this needs.
alter table public.xp_events
  add constraint tmp_force_award_failure check (amount < 0) not valid;

set role authenticated;
select pg_temp.claims(:'rival');
set client_min_messages = error;  -- the warning is expected; it is not the assertion

insert into public.projects (profile_id, name, slug, description)
values (:'rival', 'Secondly', 'secondly', 'A product created while awards are broken.');

set client_min_messages = notice;
select pg_temp.ok(
  (select count(*) from public.projects where slug = 'secondly') = 1,
  'the project persists even when the awards path raises'
);
reset role;

alter table public.xp_events drop constraint tmp_force_award_failure;

-- The awards were skipped, not silently marked as given.
select pg_temp.ok(
  (select count(*) from public.xp_events where profile_id = :'rival') = 0,
  'and the skipped XP is genuinely absent rather than faked'
);

/*
 * Self-healing, which is what makes the demotion safe. `evaluate_milestones()`
 * is idempotent and runs at the end of every domain function, so the milestone
 * missed above lands on the learner's next real action.
 */
select public.evaluate_milestones(:'rival');
select pg_temp.ok(
  (select count(*) from public.learner_milestones
    where profile_id = :'rival' and milestone_key = 'first-idea') = 1,
  'and the missed milestone is picked up on the next evaluation'
);

-- ────────────────────────────────────────────────────────────────────────────
-- Ownership, unchanged by any of this
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'rival');
select pg_temp.ok(
  (select count(*) from public.projects where slug = 'ledgerly') = 0,
  'one learner cannot see another learner''s project'
);
select pg_temp.ok(
  (select count(*) from public.projects) = 1,
  'and sees only their own'
);
reset role;

set role authenticated;
select pg_temp.claims(:'david');
select pg_temp.ok(
  (select count(*) from public.projects) = 1,
  'symmetrically, for the first learner'
);

-- The insert grant is still narrow: the forgeries Prompt 8 closed stay closed.
do $$
begin
  begin
    insert into public.projects (profile_id, name, slug, status)
    values ('11111111-1111-1111-1111-111111111111', 'Forged', 'forged', 'live');
    raise exception 'FAIL  a learner set status at creation';
  exception
    when insufficient_privilege then raise notice 'PASS  a learner still cannot set status at creation';
    when others then
      if sqlerrm like 'FAIL%' then raise; end if;
      raise notice 'PASS  a learner still cannot set status at creation [%]', sqlerrm;
  end;
end $$;
reset role;

select pg_temp.ok(true, '── project creation suite complete ──');
