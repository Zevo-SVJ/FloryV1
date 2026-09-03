-- Row Level Security, tested.
--
-- Every assertion below is a thing a hostile client would try. The suite runs
-- as `anon` and as `authenticated` with a specific `sub` claim, exactly as
-- PostgREST does, so what passes here is what the API will actually enforce.
--
-- Run with:
--   psql -d showme -v ON_ERROR_STOP=1 -f supabase/tests/00_supabase_shim.sql
--   psql -d showme -v ON_ERROR_STOP=1 -f supabase/migrations/*.sql
--   psql -d showme -v ON_ERROR_STOP=1 -f supabase/tests/01_rls.sql

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

   Row Level Security refuses work in two different ways, and a suite that only
   looks for one of them passes while the database is wide open:

     · an INSERT or UPDATE whose WITH CHECK fails raises 42501;
     · an UPDATE or DELETE filtered out by USING simply matches no rows and
       reports success.

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
    raise notice 'PASS  % [no rows matched]', label;
    return;
  end if;

  raise exception 'FAIL  % — statement changed % row(s)', label, affected;
end;
$$;

-- ── Fixtures ───────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

-- The signup trigger should already have made both profiles.
select pg_temp.ok(
  (select count(*) from public.profiles) = 2,
  'a profile is created automatically for every new auth user'
);

select pg_temp.ok(
  (select username from public.profiles where id = '11111111-1111-1111-1111-111111111111')
    = 'u' || repeat('1', 29),
  'the generated placeholder username is derived from the user id'
);

update public.profiles set username = 'alice', display_name = 'Alice'
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set username = 'bob'
  where id = '22222222-2222-2222-2222-222222222222';

-- Every link lives inside a links block from Phase 4 onwards, so the block is
-- part of the fixture rather than an afterthought.
insert into public.blocks (id, profile_id, type, position) values
  ('b10c0000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'links', 0),
  ('b10c0000-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'links', 0);

insert into public.links (id, profile_id, block_id, title, url, position, is_active) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b10c0000-0000-0000-0000-00000000000a',
   'Alice public', 'https://example.com/a', 0, true),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'b10c0000-0000-0000-0000-00000000000a',
   'Alice draft', 'https://example.com/draft', 1, false);

insert into public.page_views (profile_id, country) values
  ('11111111-1111-1111-1111-111111111111', 'FR');

insert into public.subscriptions (profile_id, plan) values
  ('11111111-1111-1111-1111-111111111111', 'pro');

-- ── Constraints ────────────────────────────────────────────────────────────

select pg_temp.denied(
  $$update public.profiles set username = 'login'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'a reserved username is rejected'
);

select pg_temp.denied(
  $$update public.profiles set username = 'Alice'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'an uppercase username is rejected'
);

select pg_temp.denied(
  $$update public.profiles set username = 'a b'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'a username containing a space is rejected'
);

select pg_temp.denied(
  $$update public.profiles set username = 'al__ice'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'doubled underscores are rejected'
);

select pg_temp.denied(
  $$update public.profiles set username = 'alice'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'a duplicate username is rejected'
);

select pg_temp.denied(
  $$insert into public.links (profile_id, block_id, title, url)
      values ('11111111-1111-1111-1111-111111111111',
              'b10c0000-0000-0000-0000-00000000000a', 'x', 'javascript:alert(1)')$$,
  'a link with a javascript: URL is rejected'
);

-- ── anon: the logged-out visitor arriving from a bio link ──────────────────
--
-- `set role` rather than `set local role`: psql runs each statement in its own
-- implicit transaction, so a LOCAL setting would be discarded before the next
-- line and every assertion would silently run as the superuser, which bypasses
-- RLS. A suite that passes because it never applied the policies is worse than
-- no suite at all.

set role anon;
select set_config('request.jwt.claims', null, false);

select pg_temp.ok(
  (select count(*) from public.profiles) = 2,
  'anon can read profiles (the public page must render logged out)'
);

select pg_temp.ok(
  (select count(*) from public.links) = 1,
  'anon sees only active links, never drafts'
);

select pg_temp.ok(
  (select count(*) from public.page_views) = 0,
  'anon cannot read anyone''s analytics'
);

select pg_temp.ok(
  (select count(*) from public.subscriptions) = 0,
  'anon cannot read anyone''s subscription'
);

select pg_temp.denied(
  $$insert into public.profiles (id, username)
      values ('33333333-3333-3333-3333-333333333333', 'mallory')$$,
  'anon cannot create a profile'
);

select pg_temp.denied(
  $$update public.profiles set bio = 'defaced' where username = 'alice'$$,
  'anon cannot edit a profile'
);

select pg_temp.denied(
  $$insert into public.page_views (profile_id) values
      ('11111111-1111-1111-1111-111111111111')$$,
  'anon cannot forge analytics rows'
);

reset role;

-- ── authenticated as Bob: the other creator ───────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222"}', false);

select pg_temp.ok(
  (select count(*) from public.links) = 1,
  'Bob sees Alice''s active link but not her draft'
);

select pg_temp.denied(
  $$update public.profiles set bio = 'defaced' where username = 'alice'$$,
  'Bob cannot edit Alice''s profile'
);

select pg_temp.denied(
  $$update public.links set title = 'hijacked'
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'Bob cannot edit Alice''s link'
);

select pg_temp.denied(
  $$delete from public.links where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'Bob cannot delete Alice''s link'
);

-- The attack the WITH CHECK clauses exist for: claiming someone else as owner.
select pg_temp.denied(
  $$insert into public.links (profile_id, block_id, title, url)
      values ('11111111-1111-1111-1111-111111111111',
              'b10c0000-0000-0000-0000-00000000000a', 'planted', 'https://evil.example')$$,
  'Bob cannot insert a link owned by Alice'
);

select pg_temp.denied(
  $$insert into public.blocks (profile_id, type)
      values ('11111111-1111-1111-1111-111111111111', 'text')$$,
  'Bob cannot insert a block owned by Alice'
);

-- The subtler one: owning the row, then handing it to someone else.
insert into public.links (id, profile_id, block_id, title, url)
  values ('bbbbbbbb-0000-0000-0000-000000000001',
          '22222222-2222-2222-2222-222222222222',
          'b10c0000-0000-0000-0000-00000000000b', 'Bob link', 'https://example.com/b');

select pg_temp.denied(
  $$update public.links set profile_id = '11111111-1111-1111-1111-111111111111'
      where id = 'bbbbbbbb-0000-0000-0000-000000000001'$$,
  'Bob cannot reassign his own link to Alice'
);

select pg_temp.ok(
  (select count(*) from public.page_views) = 0,
  'Bob cannot read Alice''s analytics'
);

select pg_temp.ok(
  (select count(*) from public.subscriptions) = 0,
  'Bob cannot read Alice''s subscription'
);

reset role;

-- ── authenticated as Alice: the owner ─────────────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111"}', false);

select pg_temp.ok(
  (select count(*) from public.links
    where profile_id = '11111111-1111-1111-1111-111111111111') = 2,
  'Alice sees her own drafts as well as her published links'
);

update public.profiles set bio = 'Ceramics in Porto.'
  where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.ok(
  (select bio from public.profiles where username = 'alice') = 'Ceramics in Porto.',
  'Alice can edit her own profile'
);

select pg_temp.ok(
  (select count(*) from public.page_views) = 1,
  'Alice can read her own analytics'
);

select pg_temp.ok(
  (select plan from public.subscriptions) = 'pro',
  'Alice can read her own subscription'
);

select pg_temp.denied(
  $$update public.subscriptions set plan = 'pro'
      where profile_id = '11111111-1111-1111-1111-111111111111'$$,
  'Alice cannot write her own entitlement'
);

select pg_temp.denied(
  $$insert into public.page_views (profile_id) values
      ('11111111-1111-1111-1111-111111111111')$$,
  'Alice cannot forge her own analytics either'
);

-- Identity theft by primary key, the reason profiles has a WITH CHECK.
select pg_temp.denied(
  $$update public.profiles set id = '22222222-2222-2222-2222-222222222222'
      where id = '11111111-1111-1111-1111-111111111111'$$,
  'Alice cannot rewrite her profile id to become Bob'
);

reset role;

-- ── Every table is protected ──────────────────────────────────────────────

select pg_temp.ok(
  not exists (
    select 1 from pg_tables
    where schemaname = 'public' and not rowsecurity
  ),
  'row level security is enabled on every table in public'
);

select pg_temp.ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and cmd in ('INSERT', 'UPDATE')
      and coalesce(with_check, qual) = 'true'
  ),
  'no write policy is unconditional'
);

do $$ begin raise notice ''; raise notice 'All RLS assertions passed.'; end $$;
