-- The display name an OAuth provider hands over.
--
-- Google does not send `display_name`; it sends `full_name` and `name`. These
-- assertions are the shapes `raw_user_meta_data` actually arrives in, and the
-- last one is the one that matters: a provider's claims are still not a source
-- of authorization.
--
-- Run with:  npm run test:db

\set ON_ERROR_STOP on
\set QUIET on
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

create or replace function pg_temp.name_for(user_id uuid)
returns text language sql stable as $$
  select display_name from public.profiles where id = user_id;
$$;

-- A Google signup, in the shape GoTrue stores it.
insert into auth.users (id, email, raw_user_meta_data) values (
  '10000000-0000-0000-0000-000000000001',
  'google@example.com',
  '{"iss": "https://accounts.google.com", "sub": "1234", "name": "Alex Rivera",
    "full_name": "Alex Rivera", "email": "google@example.com",
    "avatar_url": "https://lh3.googleusercontent.com/a/x",
    "email_verified": true}'::jsonb
);

select pg_temp.ok(
  pg_temp.name_for('10000000-0000-0000-0000-000000000001') = 'Alex Rivera',
  'a Google account is named from full_name'
);

-- A provider that sends only the OIDC standard claim.
insert into auth.users (id, email, raw_user_meta_data) values (
  '10000000-0000-0000-0000-000000000002',
  'oidc@example.com',
  '{"name": "Sam Okafor"}'::jsonb
);

select pg_temp.ok(
  pg_temp.name_for('10000000-0000-0000-0000-000000000002') = 'Sam Okafor',
  'name is used when full_name is absent'
);

-- LOCK's own form wins over a provider's, when both somehow appear.
insert into auth.users (id, email, raw_user_meta_data) values (
  '10000000-0000-0000-0000-000000000003',
  'both@example.com',
  '{"display_name": "Chosen", "full_name": "Provider", "name": "Provider"}'::jsonb
);

select pg_temp.ok(
  pg_temp.name_for('10000000-0000-0000-0000-000000000003') = 'Chosen',
  'display_name takes precedence over a provider name'
);

-- An empty string must fall through rather than win with nothing.
insert into auth.users (id, email, raw_user_meta_data) values (
  '10000000-0000-0000-0000-000000000004',
  'blank@example.com',
  '{"display_name": "   ", "full_name": "", "name": "Fallback"}'::jsonb
);

select pg_temp.ok(
  pg_temp.name_for('10000000-0000-0000-0000-000000000004') = 'Fallback',
  'a blank name falls through to the next key'
);

-- No name at all is a supported state; the interface falls back.
insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-0000-0000-000000000005', 'nameless@example.com', '{}'::jsonb);

select pg_temp.ok(
  pg_temp.name_for('10000000-0000-0000-0000-000000000005') is null,
  'an account with no name anywhere gets a null one, not an empty string'
);

-- The table's check constraint caps this at 80; the trigger must not hand it
-- something longer and abort the whole signup transaction.
insert into auth.users (id, email, raw_user_meta_data) values (
  '10000000-0000-0000-0000-000000000006',
  'long@example.com',
  jsonb_build_object('full_name', repeat('x', 300))
);

select pg_temp.ok(
  char_length(pg_temp.name_for('10000000-0000-0000-0000-000000000006')) = 80,
  'an over-long provider name is truncated rather than refused'
);

-- The one that matters.
insert into auth.users (id, email, raw_user_meta_data) values (
  '10000000-0000-0000-0000-000000000007',
  'escalate@example.com',
  '{"full_name": "Mallory", "role": "admin", "app_role": "admin"}'::jsonb
);

select pg_temp.ok(
  (select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000007') = 'learner',
  'a role in an OAuth provider''s claims is still ignored'
);

select pg_temp.ok(true, '── oauth display name suite complete ──');
