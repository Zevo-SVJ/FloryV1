-- A minimal stand-in for the parts of Supabase the migration depends on.
--
-- Not part of the application: this exists so the schema and, more importantly,
-- the Row Level Security policies can be run against a real Postgres in CI
-- without a Supabase project. It recreates only what Supabase provides —
-- the `auth` schema, an `auth.users` table, `auth.uid()` reading the request's
-- JWT claim, and the `anon` / `authenticated` roles with the same grants.

create schema if not exists extensions;
create schema if not exists auth;

-- Roles are cluster-wide, so a second run of the suite would collide with the
-- first. Created only when absent.
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
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Only the columns this schema depends on. `raw_user_meta_data` is where
-- GoTrue stores `options.data` from `signUp`, and is how the username the user
-- typed reaches the profile trigger inside the same transaction.
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
