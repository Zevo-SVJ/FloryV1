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

-- ────────────────────────────────────────────────────────────────────────────
-- storage
-- ────────────────────────────────────────────────────────────────────────────

-- Enough of Supabase Storage to create and exercise the bucket policies. The
-- real `storage.objects` has more columns and its own triggers; what matters
-- here is that `bucket_id`, `name` and `owner` exist, that RLS is on, and that
-- `storage.foldername()` splits a path the same way — because those three are
-- what every policy in the migration is written against.
create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  metadata jsonb,
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;

-- Supabase's own definition: the path split on '/', with the final segment
-- (the file name) dropped, so `a/b/c.png` yields `{a,b}` and `uid/x.png`
-- yields `{uid}`.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1 : array_length(parts, 1) - 1];
end;
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
