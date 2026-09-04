-- A minimal stand-in for the parts of Supabase this schema depends on.
--
-- Not part of the application. It exists so the migration — and above all its
-- Row Level Security policies and column privileges — can be run against a real
-- PostgreSQL without a Supabase project, which is the only way to test them
-- honestly. It recreates the `auth` schema, enough of `auth.users` for the
-- signup trigger, `auth.uid()` reading the request's JWT claim, and the
-- `anon` / `authenticated` / `service_role` roles with Supabase's own grants.

create schema if not exists extensions;
create schema if not exists auth;

-- Roles are cluster-wide, so a second run would collide with the first.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- The default that matters. Supabase grants the API roles everything on new
-- objects in `public`, which is exactly what the migration revokes on
-- `profiles`. Without this line the test would prove nothing: the revoke would
-- be removing a privilege that was never granted.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Only the columns this schema touches. `raw_user_meta_data` is where GoTrue
-- stores `options.data` from `signUp()`, and is the untrusted field the profile
-- trigger reads a display name — and deliberately not a role — out of.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Supabase sets `request.jwt.claims` per statement from the verified JWT.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
