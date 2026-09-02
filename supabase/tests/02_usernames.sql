-- Usernames, onboarding, and the rules that hold when the UI is bypassed.
--
-- Everything here is a thing somebody could do with `supabase-js` from a
-- browser console, or by racing two signups. The application's checks are for
-- the person typing; these are what actually decide.

\set ON_ERROR_STOP on
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
    raise notice 'PASS  % [no rows matched]', label;
    return;
  end if;

  raise exception 'FAIL  % — statement changed % row(s)', label, affected;
end;
$$;

-- ── The rules, as the database sees them ──────────────────────────────────

select pg_temp.ok(public.normalize_username('  Alex  ') = 'alex',
  'normalize lowercases and trims');
select pg_temp.ok(public.normalize_username('john doe') = 'john doe',
  'normalize does not strip — "john doe" stays invalid rather than becoming "johndoe"');

select pg_temp.ok(public.username_is_valid('alex'), 'alex is valid');
select pg_temp.ok(public.username_is_valid('john-doe'), 'john-doe is valid');
select pg_temp.ok(public.username_is_valid('john_doe'), 'john_doe is valid');
select pg_temp.ok(public.username_is_valid('john123'), 'john123 is valid');
select pg_temp.ok(public.username_is_valid('abc'), 'three characters is the minimum');
select pg_temp.ok(public.username_is_valid(repeat('a', 30)), 'thirty characters is the maximum');

select pg_temp.ok(not public.username_is_valid('ab'), 'two characters is too short');
select pg_temp.ok(not public.username_is_valid(repeat('a', 31)), 'thirty-one is too long');
select pg_temp.ok(not public.username_is_valid('john doe'), 'a space is refused');
select pg_temp.ok(not public.username_is_valid('john.doe'), 'a period is refused');
select pg_temp.ok(not public.username_is_valid('john/doe'), 'a slash is refused');
select pg_temp.ok(not public.username_is_valid('john@doe'), 'an at sign is refused');
select pg_temp.ok(not public.username_is_valid('🔥john'), 'an emoji is refused');
select pg_temp.ok(not public.username_is_valid('John'), 'uppercase is refused');
select pg_temp.ok(not public.username_is_valid('-john'), 'a leading hyphen is refused');
select pg_temp.ok(not public.username_is_valid('john-'), 'a trailing hyphen is refused');
select pg_temp.ok(not public.username_is_valid('john--doe'), 'doubled hyphens are refused');
select pg_temp.ok(not public.username_is_valid('john-_doe'), 'mixed adjacent separators are refused');

-- ── Signup: the username travels with the account ─────────────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'alex@example.com',
   '{"username":"alex"}'::jsonb);

select pg_temp.ok(
  (select username from public.profiles where id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 'alex',
  'a username supplied at signup is used for the profile'
);

select pg_temp.ok(
  (select username_claimed_at is not null from public.profiles
    where id = '0a5e7d31-64bc-4e02-9c88-000000000001'),
  'a username chosen at signup is marked as claimed'
);

-- The whole point of doing this in a trigger: one transaction, or none.
select pg_temp.ok(
  (select count(*) from auth.users u
     join public.profiles p on p.id = u.id) = (select count(*) from auth.users),
  'every auth user has a profile — there is no window where one exists without the other'
);

-- Signup with a name somebody already holds must fail the whole insert, not
-- leave an account behind with no page.
do $$
declare
  before_count bigint;
begin
  select count(*) into before_count from auth.users;
  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      ('e93b2a67-1f5d-4d81-a406-000000000002', 'impostor@example.com',
       '{"username":"alex"}'::jsonb);
    raise exception 'FAIL  a duplicate username at signup was allowed';
  exception when unique_violation then
    if (select count(*) from auth.users) <> before_count then
      raise exception 'FAIL  the auth user survived a failed profile insert';
    end if;
    raise notice 'PASS  a taken username fails signup atomically, leaving no orphaned account';
  end;
end
$$;

-- ── Signup without a usable username lands in onboarding ──────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('3f8a1c2e-0d41-4b90-9a11-000000000001', 'nometa@example.com', '{}'::jsonb),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', 'bad@example.com',
   '{"username":"john doe"}'::jsonb),
  ('c14d6f80-9e23-4a58-b7d2-000000000003', 'reserved@example.com',
   '{"username":"dashboard"}'::jsonb);

select pg_temp.ok(
  (select count(*) from public.profiles
    where id in ('3f8a1c2e-0d41-4b90-9a11-000000000001',
                 '7c02e9b4-51aa-4c37-8f60-000000000002',
                 'c14d6f80-9e23-4a58-b7d2-000000000003')
      and username_claimed_at is null) = 3,
  'missing, malformed and reserved usernames all fall back to a placeholder'
);

select pg_temp.ok(
  (select username from public.profiles where id = '3f8a1c2e-0d41-4b90-9a11-000000000001')
    = 'u3f8a1c2e0d414b909a11000000000',
  'the placeholder is derived from the account id'
);

-- The failure this guards against: a truncation short enough that ordinary
-- ids collide. Twelve digits was not enough — fixtures and seeded ids share
-- prefixes all the time.
select pg_temp.ok(
  public.placeholder_username('11111111-1111-1111-1111-111111111111')
    <> public.placeholder_username('11111111-1111-1111-1111-211111111111'),
  'ids that share a long prefix still get different placeholders'
);

select pg_temp.ok(
  public.username_is_valid(public.placeholder_username(extensions.gen_random_uuid())),
  'a placeholder is itself a valid username, so the format constraint accepts it'
);

-- ── Claiming a username ───────────────────────────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"3f8a1c2e-0d41-4b90-9a11-000000000001"}', false);

update public.profiles set username = 'newcomer'
  where id = '3f8a1c2e-0d41-4b90-9a11-000000000001';

select pg_temp.ok(
  (select username_claimed_at is not null from public.profiles
    where id = '3f8a1c2e-0d41-4b90-9a11-000000000001'),
  'claiming a username stamps username_claimed_at automatically'
);

-- Write-once: changing a public URL breaks links, and nothing handles that yet.
select pg_temp.denied(
  $$update public.profiles set username = 'newcomer2'
      where id = '3f8a1c2e-0d41-4b90-9a11-000000000001'$$,
  'a claimed username cannot be changed'
);

-- The obvious way around write-once, closed.
select pg_temp.denied(
  $$update public.profiles set username_claimed_at = null
      where id = '3f8a1c2e-0d41-4b90-9a11-000000000001'$$,
  'a client cannot reset itself to unclaimed to rename freely'
);

select pg_temp.denied(
  $$update public.profiles set username = 'alex'
      where id = '7c02e9b4-51aa-4c37-8f60-000000000002'$$,
  'one user cannot claim a username on another user''s profile'
);

reset role;

-- ── Squatting on somebody else's placeholder ──────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"7c02e9b4-51aa-4c37-8f60-000000000002"}', false);

select pg_temp.denied(
  format($$update public.profiles set username = %L where id = %L$$,
         public.placeholder_username('c14d6f80-9e23-4a58-b7d2-000000000003'),
         '7c02e9b4-51aa-4c37-8f60-000000000002'),
  'a user cannot claim another account''s placeholder and take over its address'
);

-- Reserved and malformed names are refused at the database, not just the form.
select pg_temp.denied(
  $$update public.profiles set username = 'admin'
      where id = '7c02e9b4-51aa-4c37-8f60-000000000002'$$,
  'a reserved username is refused when claimed directly'
);

select pg_temp.denied(
  $$update public.profiles set username = 'john doe'
      where id = '7c02e9b4-51aa-4c37-8f60-000000000002'$$,
  'a malformed username is refused when claimed directly'
);

select pg_temp.denied(
  $$update public.profiles set username = 'ab'
      where id = '7c02e9b4-51aa-4c37-8f60-000000000002'$$,
  'a too-short username is refused when claimed directly'
);

reset role;

-- ── The race two users lose together ──────────────────────────────────────

-- Both hold an unclaimed placeholder and both want the same name. The check
-- either of them ran a moment ago is irrelevant; the unique index decides.
do $$
declare
  winner text;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"7c02e9b4-51aa-4c37-8f60-000000000002"}', false);
  set local role authenticated;
  update public.profiles set username = 'contested'
    where id = '7c02e9b4-51aa-4c37-8f60-000000000002';
  reset role;

  perform set_config('request.jwt.claims',
    '{"sub":"c14d6f80-9e23-4a58-b7d2-000000000003"}', false);
  set local role authenticated;
  begin
    update public.profiles set username = 'contested'
      where id = 'c14d6f80-9e23-4a58-b7d2-000000000003';
    raise exception 'FAIL  the second claim on a contested username succeeded';
  exception when unique_violation then
    raise notice 'PASS  a contested username is decided by the unique index, not by the check';
  end;
  reset role;

  select username into winner from public.profiles
    where id = '7c02e9b4-51aa-4c37-8f60-000000000002';
  if winner <> 'contested' then
    raise exception 'FAIL  the winner did not keep the name';
  end if;
end
$$;

-- ── Ownership, again, now that usernames matter ───────────────────────────

set role anon;
select set_config('request.jwt.claims', null, false);

select pg_temp.ok(
  (select count(*) from public.profiles where username = 'alex') = 1,
  'a logged-out visitor can resolve a username to a profile'
);

select pg_temp.denied(
  $$update public.profiles set username = 'stolen' where username = 'alex'$$,
  'a logged-out visitor cannot rename anybody'
);

reset role;

do $$ begin raise notice ''; raise notice 'All username assertions passed.'; end $$;
