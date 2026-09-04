-- The security model, tested.
--
-- Every assertion below is something a hostile client would try. The suite runs
-- as `anon` and as `authenticated` with a specific `sub` claim, exactly as
-- PostgREST does, so what passes here is what the API will actually enforce.
--
-- Run with:  npm run test:db

\set ON_ERROR_STOP on
\set QUIET on
-- Assertions report through NOTICE, so they must not be filtered out.
set client_min_messages = notice;

create or replace function pg_temp.ok(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  %', label;
  end if;
end;
$$;

/* Assert that a statement changes nothing.

   The database refuses work in two different ways, and a suite that only looks
   for one of them passes while the door is open:

     · a privilege or WITH CHECK violation raises (42501 and friends);
     · an UPDATE or DELETE filtered out by a USING clause simply matches no
       rows and reports success.

   Both are denials. Anything that actually touched a row is not. */
create or replace function pg_temp.denied(statement text, label text)
returns void language plpgsql as $$
declare
  affected bigint;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when others then
    raise notice 'PASS  % [refused: %]', label, sqlerrm;
    return;
  end;

  if affected = 0 then
    raise notice 'PASS  % [no rows]', label;
  else
    raise exception 'FAIL  % [% row(s) affected]', label, affected;
  end if;
end;
$$;

-- Become an API caller: the role PostgREST connects as, carrying a verified
-- JWT whose `sub` is the account id.
create or replace function pg_temp.claims(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text)::text,
    false
  );
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Fixtures
-- ────────────────────────────────────────────────────────────────────────────

\set learner   '11111111-1111-1111-1111-111111111111'
\set other     '22222222-2222-2222-2222-222222222222'
\set mentor    '33333333-3333-3333-3333-333333333333'
\set admin_id  '44444444-4444-4444-4444-444444444444'

-- Accounts are created the way GoTrue creates them: an insert into auth.users,
-- nothing else. Every profile below is the work of the signup trigger.
insert into auth.users (id, email, raw_user_meta_data) values
  (:'learner', 'learner@example.com', '{"display_name": "  Alex  "}'::jsonb),
  (:'other',   'other@example.com',   '{}'::jsonb),
  (:'mentor',  'mentor@example.com',  '{}'::jsonb),
  (:'admin_id','admin@example.com',   '{}'::jsonb);

select pg_temp.ok(
  (select count(*) from public.profiles) = 4,
  'a profile is created for every new account'
);

select pg_temp.ok(
  (select display_name from public.profiles where id = :'learner') = 'Alex',
  'the display name from signup metadata is trimmed and stored'
);

select pg_temp.ok(
  (select bool_and(role = 'learner') from public.profiles),
  'every new account starts as a learner'
);

-- The escalation attempt that costs nothing to try: put a role in the signup
-- payload and see whether the trigger believes it.
insert into auth.users (id, email, raw_user_meta_data)
values (
  '55555555-5555-5555-5555-555555555555',
  'sneaky@example.com',
  '{"display_name": "Mallory", "role": "admin"}'::jsonb
);

select pg_temp.ok(
  (select role from public.profiles
    where id = '55555555-5555-5555-5555-555555555555') = 'learner',
  'a role in signup metadata is ignored'
);

-- Promotion is an out-of-band act by the project owner, which is what this is.
update public.profiles set role = 'mentor' where id = :'mentor';
update public.profiles set role = 'admin'  where id = :'admin_id';

-- ────────────────────────────────────────────────────────────────────────────
-- anon: LOCK has no public data
-- ────────────────────────────────────────────────────────────────────────────

set role anon;
select pg_temp.claims(null);

-- Not "sees zero rows" but "is refused at the door": `anon` is granted no
-- privilege on the table at all, so the read fails before RLS is consulted.
select pg_temp.denied(
  'select * from public.profiles',
  'anon reads no profiles'
);

select pg_temp.denied(
  format('update public.profiles set display_name = ''anon was here'' where id = %L', :'learner'),
  'anon cannot edit a profile'
);

reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- learner: their own row, and nothing else
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'learner');

select pg_temp.ok(
  (select count(*) from public.profiles) = 1,
  'a learner sees exactly one profile'
);

select pg_temp.ok(
  (select id from public.profiles) = :'learner',
  'and it is their own'
);

update public.profiles set display_name = 'Alex R.' where id = :'learner';
select pg_temp.ok(
  (select display_name from public.profiles where id = :'learner') = 'Alex R.',
  'a learner can rename themselves'
);

select pg_temp.ok(
  (select updated_at > created_at from public.profiles where id = :'learner'),
  'updated_at is maintained by the database'
);

select pg_temp.denied(
  format('update public.profiles set display_name = ''owned'' where id = %L', :'other'),
  'a learner cannot rename somebody else'
);

-- The one that matters most. Two barriers stand behind this statement: the
-- column privilege, and the trigger.
select pg_temp.denied(
  format('update public.profiles set role = ''admin'' where id = %L', :'learner'),
  'a learner cannot promote themselves'
);

select pg_temp.denied(
  format('update public.profiles set role = ''admin'' where id = %L', :'other'),
  'a learner cannot promote anybody else'
);

select pg_temp.denied(
  format('update public.profiles set id = %L where id = %L', :'other', :'learner'),
  'a learner cannot move their row onto another id'
);

select pg_temp.denied(
  format('insert into public.profiles (id, display_name) values (%L, ''forged'')',
         '99999999-9999-9999-9999-999999999999'),
  'no client may insert a profile'
);

select pg_temp.denied(
  format('delete from public.profiles where id = %L', :'learner'),
  'no client may delete a profile'
);

select pg_temp.ok(
  public.current_app_role() = 'learner' and not public.is_staff() and not public.is_admin(),
  'the role helpers answer for the caller'
);

reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- mentor: reads everything, owns one row
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'mentor');

select pg_temp.ok(
  (select count(*) from public.profiles) = 5,
  'a mentor reads every profile'
);

select pg_temp.ok(
  public.is_staff() and not public.is_admin(),
  'a mentor is staff but not an admin'
);

select pg_temp.denied(
  format('update public.profiles set display_name = ''relabelled'' where id = %L', :'learner'),
  'a mentor cannot edit a learner''s profile'
);

select pg_temp.denied(
  format('update public.profiles set role = ''mentor'' where id = %L', :'learner'),
  'a mentor cannot promote a learner'
);

reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- admin: staff, and still not able to write a role through the API
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'admin_id');

select pg_temp.ok(
  public.is_staff() and public.is_admin(),
  'an admin is both'
);

select pg_temp.ok(
  (select count(*) from public.profiles) = 5,
  'an admin reads every profile'
);

-- Deliberate. The admin role grants authority inside the product; it does not
-- grant the ability to rewrite the authorization table from a browser. Role
-- changes are SQL run by the project owner, and Prompt 6 may add a
-- `security definer` function with its own audit trail if that becomes
-- inconvenient — that would be a considered decision, not a loosened grant.
select pg_temp.denied(
  format('update public.profiles set role = ''admin'' where id = %L', :'learner'),
  'not even an admin can change a role through the API'
);

reset role;

-- ────────────────────────────────────────────────────────────────────────────
-- Constraints
-- ────────────────────────────────────────────────────────────────────────────

set role authenticated;
select pg_temp.claims(:'learner');

select pg_temp.denied(
  format('update public.profiles set display_name = %L where id = %L',
         repeat('x', 81), :'learner'),
  'a display name longer than 80 characters is refused'
);

select pg_temp.denied(
  format('update public.profiles set display_name = ''   '' where id = %L', :'learner'),
  'a display name of only whitespace is refused'
);

reset role;

select pg_temp.ok(true, '── security suite complete ──');
