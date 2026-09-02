-- ShowMe — usernames people actually choose
--
-- Phase 1 gave every new account a system-generated placeholder. Phase 2 lets
-- people pick their own name during signup, which changes three things:
--
--   1. Hyphens become legal. `john-doe` is a name creators expect to be able
--      to use, and it is safe in a URL path.
--   2. A profile now records whether its username was chosen or assigned, so
--      the application can tell a finished signup from an unfinished one.
--   3. The username the user typed arrives with the auth insert, so the
--      profile is created with the right name inside the same transaction —
--      there is no window in which the account exists without its page.

-- ────────────────────────────────────────────────────────────────────────────
-- Username rules, in one place
-- ────────────────────────────────────────────────────────────────────────────

-- These mirror src/lib/validation/username.ts exactly. Two copies is the price
-- of enforcing the rules where they cannot be skipped while still giving the
-- browser instant feedback; the test suite checks the two agree.

-- Fold, do not strip. Turning "john doe" into "johndoe" would hand somebody a
-- name they did not ask for, so normalization only lowercases and trims — the
-- validator then rejects anything that is left over.
create or replace function public.normalize_username(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(normalize(coalesce(input, ''), nfkc)));
$$;

create or replace function public.username_is_valid(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    candidate is not null
    -- Lowercase letters, digits, underscore and hyphen. Must start and end
    -- with a letter or digit, so no name is bounded by punctuation.
    and candidate ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$'
    -- No two separators in a row: `a__b`, `a--b` and `a-_b` all read as typos.
    and candidate !~ '[_-]{2}';
$$;

-- The name given to an account that has not chosen one yet.
--
-- Derived from the user id so it needs no loop and no collision check. It
-- keeps 29 of the id's 32 hex digits, the most that fits inside the 30
-- character limit alongside the prefix.
--
-- Truncation is not strictly injective — two ids differing only in their last
-- three hex digits would share a placeholder — but auth ids are random v4
-- uuids, which makes that a 2^-116 event. It is reachable only by an operator
-- choosing ids deliberately through the admin API, and the outcome is a
-- refused signup rather than one account reaching another's page. The shorter
-- twelve-digit form used before Phase 2 was not safe on the same grounds: ids
-- sharing a prefix are easy to produce by accident in fixtures and seeds.
create or replace function public.placeholder_username(user_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'u' || substr(replace(user_id::text, '-', ''), 1, 29);
$$;

create or replace function public.is_placeholder_username(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate ~ '^u[0-9a-f]{29}$';
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- profiles: hyphens, and a record of who chose the name
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles drop constraint profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (public.username_is_valid(username));

-- Null means the name was assigned by the system and signup is unfinished.
-- Set by a trigger, never by the client — see profiles_guard_username below.
alter table public.profiles
  add column username_claimed_at timestamptz;

comment on column public.profiles.username_claimed_at is
  'When the owner chose this username. Null means a system placeholder is still in place and onboarding is incomplete.';

-- Existing rows: anything matching the Phase 1 placeholder shape was assigned,
-- everything else was chosen deliberately.
update public.profiles
   set username_claimed_at = created_at
 where username !~ '^user_[0-9a-f]{12}$';

-- Phase 1 placeholders are renamed to the new shape so one rule describes them.
update public.profiles
   set username = public.placeholder_username(id)
 where username ~ '^user_[0-9a-f]{12}$';

-- Finding accounts stuck in onboarding, and nothing else, so the index only
-- carries the rows that are actually unfinished.
create index profiles_unclaimed_idx
  on public.profiles (created_at)
  where username_claimed_at is null;

-- ────────────────────────────────────────────────────────────────────────────
-- Reserved names
-- ────────────────────────────────────────────────────────────────────────────

-- Hyphenated entries are meaningful again now that hyphens are legal
-- characters: in Phase 1 they normalized away and protected nothing.
insert into public.reserved_usernames (username, reason) values
  ('administrator', 'route'), ('app', 'route'), ('account', 'route'),
  ('accounts', 'route'), ('billing', 'route'), ('documentation', 'route'),
  ('developer', 'route'), ('developers', 'route'), ('download', 'route'),
  ('downloads', 'route'), ('enterprise', 'route'), ('faq', 'route'),
  ('feedback', 'route'), ('index', 'route'), ('invite', 'route'),
  ('jobs', 'route'), ('new', 'route'),
  ('onboarding', 'route'), ('partners', 'route'), ('password', 'route'),
  ('plans', 'route'), ('press', 'route'), ('profile', 'route'),
  ('profiles', 'route'), ('register', 'route'), ('reset', 'route'),
  ('user', 'route'), ('users', 'route'), ('verify', 'route'),
  ('show-me', 'brand'), ('show', 'brand'), ('showme-app', 'brand'),
  ('well-known', 'infrastructure'), ('mail', 'infrastructure'),
  ('smtp', 'infrastructure'), ('ftp', 'infrastructure'),
  ('ns1', 'infrastructure'), ('ns2', 'infrastructure')
on conflict (username) do nothing;

-- Entries that no username could ever take protect nothing. `wellknown` was a
-- Phase 1 workaround for hyphens being stripped — the real segment is
-- `.well-known`, representable now — and `_next` cannot start a username at
-- all. A static route beats `[username]` regardless.
delete from public.reserved_usernames where username in ('wellknown', '_next');

-- ────────────────────────────────────────────────────────────────────────────
-- The reserved check, extended
-- ────────────────────────────────────────────────────────────────────────────

-- A placeholder belongs to exactly one account. Without this, somebody could
-- claim another user's placeholder as their own name and take over the address
-- that account is about to be given.
create or replace function public.reject_reserved_username()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.reserved_usernames r where r.username = new.username) then
    raise exception 'username_reserved' using
      errcode = 'check_violation',
      detail = format('The username %L is reserved.', new.username);
  end if;

  if public.is_placeholder_username(new.username)
     and new.username <> public.placeholder_username(new.id) then
    raise exception 'username_reserved' using
      errcode = 'check_violation',
      detail = 'System placeholder usernames cannot be claimed.';
  end if;

  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- The username is write-once, for now
-- ────────────────────────────────────────────────────────────────────────────

-- Changing a username changes a public URL, which means old links break,
-- search results rot, and analytics split in two. None of that is handled yet,
-- so the database refuses the change rather than leaving the door open for a
-- client to walk through `supabase-js` directly.
--
-- The trigger also owns `username_claimed_at` outright. A client that could set
-- it could reset itself to "unclaimed" and rename freely, which would defeat
-- the whole rule.
create or replace function public.guard_username_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    if old.username_claimed_at is not null then
      raise exception 'username_immutable' using
        errcode = 'check_violation',
        detail = 'A username can only be chosen once.';
    end if;
    -- The one permitted change: replacing the system placeholder.
    new.username_claimed_at := now();
  elsif new.username_claimed_at is distinct from old.username_claimed_at then
    -- Refused rather than quietly reverted. Silently preserving the old value
    -- would answer a rejected write with a success, and the caller would go on
    -- believing it had reset itself to unclaimed.
    raise exception 'username_claimed_at_immutable' using
      errcode = 'check_violation',
      detail = 'username_claimed_at is maintained by the database.';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_username
  before update on public.profiles
  for each row execute function public.guard_username_change();

-- ────────────────────────────────────────────────────────────────────────────
-- Profile creation, with the name the user chose
-- ────────────────────────────────────────────────────────────────────────────

-- Runs inside the transaction that inserts the auth user, so an account and its
-- page are created together or not at all.
--
-- The desired username arrives in `raw_user_meta_data`, put there by
-- `supabase.auth.signUp({ options: { data: { username } } })`. Two outcomes:
--
--   · usable  → the profile is created with it, already claimed, and signup
--               finishes at the dashboard.
--   · missing or malformed → a placeholder is assigned and the account lands
--               in onboarding. This is the path for users created outside the
--               signup form, such as from the Supabase dashboard.
--
-- A name that is well-formed but already taken is deliberately NOT handled
-- here: the unique index raises, the whole transaction rolls back, and no
-- orphaned auth user is left behind. The application turns that into "taken"
-- and asks for another name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  desired text;
begin
  desired := public.normalize_username(new.raw_user_meta_data ->> 'username');

  if public.username_is_valid(desired)
     and not exists (select 1 from public.reserved_usernames r where r.username = desired)
     and not public.is_placeholder_username(desired)
  then
    insert into public.profiles (id, username, username_claimed_at)
    values (new.id, desired, now())
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, username)
    values (new.id, public.placeholder_username(new.id))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
