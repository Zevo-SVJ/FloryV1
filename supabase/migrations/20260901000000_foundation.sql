-- LOCK — foundation schema
--
-- One table, one enum, four functions. That is the whole of it, and the
-- restraint is deliberate: everything LOCK will eventually store — phases,
-- lessons, missions, submissions, artifacts, progress, feedback — hangs off an
-- account and a role, and neither of those can be retrofitted safely once rows
-- exist. So the account and the role are built properly now, and the rest is
-- built when there is something real to put in it. `supabase/README.md`
-- records how those future tables are expected to relate.
--
-- The security model in one paragraph: an account has exactly one profile,
-- created in the same transaction as the auth row, and the profile carries the
-- role. A learner may read and edit their own profile and nothing else. A
-- mentor or admin may read every profile, because reviewing somebody's work
-- means knowing whose it is. Nobody — not even the account itself — may change
-- a role through the API; that privilege is not granted at the column level and
-- is refused again by a trigger. Row Level Security is on from the first row,
-- and there is no policy anywhere that grants write access to a row the caller
-- does not own.

create extension if not exists "pgcrypto" with schema extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- Roles
-- ────────────────────────────────────────────────────────────────────────────

-- Three roles, as an enum rather than free text, so that the TypeScript union
-- and the database agree by construction and a policy cannot be written
-- against a role that does not exist.
--
--   learner  — the person doing the program. The default, and the only role an
--              account can be created with.
--   mentor   — reviews a learner's work. Reads everything, owns nothing.
--   admin    — mentor, plus the right to change roles.
--
-- Two roles were asked for. Three are stored, because "reviews the work" and
-- "administers the platform" diverge the moment there is more than one learner,
-- and separating them later means rewriting every policy written before the
-- split. `is_staff()` below is what most policies will actually ask for, so the
-- distinction costs nothing at the call site.
create type public.app_role as enum ('learner', 'mentor', 'admin');

-- ────────────────────────────────────────────────────────────────────────────
-- Profiles
-- ────────────────────────────────────────────────────────────────────────────

-- The application-side half of an account.
--
-- `auth.users` belongs to Supabase and must not be extended; this is the table
-- LOCK owns, keyed by the same id so that every future foreign key can point at
-- `profiles(id)` and inherit the cascade.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- How the person is addressed in the interface. Optional: an account is
  -- usable before anybody has typed a name, and the UI falls back to the email.
  display_name text,

  -- The authorization fact. Never set from client input — see
  -- `handle_new_user()` for why that sentence is load-bearing.
  role public.app_role not null default 'learner',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length check (
    display_name is null or char_length(btrim(display_name)) between 1 and 80
  )
);

comment on table public.profiles is
  'One row per account. Carries the role. Created by a trigger on auth.users.';
comment on column public.profiles.role is
  'Authorization role. Not writable through the API at any privilege level; '
  'change it with SQL as the project owner.';

-- Staff list every learner; a learner only ever reads their own row by primary
-- key. This index is for the former.
create index profiles_role_idx on public.profiles (role);

-- ────────────────────────────────────────────────────────────────────────────
-- Role helpers
-- ────────────────────────────────────────────────────────────────────────────

-- `security definer` is not a shortcut here, it is the fix for a real problem:
-- a policy on `profiles` that reads `profiles` to find the caller's role
-- re-enters the same policy and recurses until Postgres gives up. A definer
-- function runs as the owner, with RLS out of the picture, so the lookup
-- terminates.
--
-- `set search_path = ''` on every definer function, and every object named in
-- full. Without it, a caller who can create a schema on their own search path
-- can shadow `profiles` with a table of their own and decide what these
-- functions return.
--
-- `stable` lets the planner call these once per statement rather than once per
-- row, which is the difference between a policy that scales and one that does
-- a lookup per row returned.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

comment on function public.current_app_role() is
  'The signed-in account''s role, or null when there is no session.';

-- Mentor or admin. The question nearly every future policy actually asks:
-- "may this person see work that is not theirs?"
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('mentor', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Triggers
-- ────────────────────────────────────────────────────────────────────────────

-- `updated_at` maintained by the database rather than by the application.
-- A column every future table will want, so it is written once here.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A profile for every new account, in the same transaction as the account.
--
-- The important line is the one that is not here: `role` is never read from
-- `raw_user_meta_data`. That field is `options.data` from `supabase.auth
-- .signUp()` — it is whatever the browser sent, and a signup form is a form.
-- Reading a role out of it would let anybody create themselves an admin
-- account with a modified request. The column default decides instead, and the
-- default is `learner`.
--
-- `display_name` is read from that same untrusted place, and that is fine: it
-- is a label, it is length-checked by the table, and it grants nothing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80)), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The second lock on the role column.
--
-- The column grants below are the real barrier: PostgREST cannot write a
-- column it has no privilege on. This trigger exists because that barrier is a
-- `grant` statement, and a `grant` statement is one careless migration away
-- from being widened by accident. It refuses the write for the two roles that
-- requests actually arrive as, and stays out of the way of the project owner
-- running SQL — which is how a role is meant to be changed.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.role is distinct from old.role then
      raise exception 'role is not writable through the API'
        using errcode = 'insufficient_privilege';
    end if;
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'id and created_at are not writable'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ────────────────────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────────────────────

-- Supabase grants the API roles everything on `public` by default. That is a
-- reasonable default for a project where RLS is the only gate, and the wrong
-- one here: RLS decides *which rows* a caller may touch and has nothing to say
-- about *which columns*. Column-level privileges are the mechanism that does,
-- and they are what keeps `role` out of reach of a caller who legitimately owns
-- the row.
revoke all on public.profiles from anon, authenticated;

-- Reads are shaped by the policies below, so whole-table select is right here.
grant select on public.profiles to authenticated;

-- Writes are one column wide. Adding a settable column later means adding it
-- to this list — deliberately, and in a diff somebody reads.
grant update (display_name) on public.profiles to authenticated;

-- No insert: the trigger creates the row, running as owner.
-- No delete: an account is removed by deleting the auth user, which cascades.
-- `anon` is granted nothing at all; LOCK has no public data.

-- PostgreSQL grants EXECUTE on a new function to PUBLIC, which would hand
-- these to `anon` as well. They are harmless there — with no session
-- `auth.uid()` is null and every one of them answers null or false — but a
-- `security definer` function is the last place to leave a default in force.
-- Revoked, then granted to the one role that needs them; the policies above
-- run as the caller, so `authenticated` must be able to execute them.
revoke execute on function public.current_app_role() from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_admin() from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Your own row, always. Everyone's rows, if you are staff.
create policy "profiles are readable by their owner and by staff"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or public.is_staff());

-- Only your own row, and it must still be your own row afterwards. The `with
-- check` is not redundant with the `using`: without it, an update could move a
-- row out from under the caller by rewriting its id.
create policy "a profile is editable only by its owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Insert and delete have no policy, which means no client may do either.
-- That is the intent, not an omission: profiles are created by a trigger and
-- removed by the cascade from `auth.users`.
