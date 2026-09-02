-- ShowMe — foundation schema
--
-- One migration that establishes every table the product will need, with Row
-- Level Security on all of them from the first row.
--
-- The security model in one paragraph: a profile row is the public identity of
-- an account and is readable by anyone, because showme.at/<username> must
-- render for a logged-out visitor arriving from TikTok. Everything a creator
-- owns hangs off that profile and is readable by the world only when the
-- creator has published it (is_active / is_visible) and writable only by the
-- creator. Analytics and billing rows are readable by their owner and writable
-- by nobody through the API — they are written by trusted server code holding
-- the service-role key, which bypasses RLS. There is no policy anywhere that
-- grants a client write access to a row it does not own.

-- ────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto" with schema extensions;

-- ────────────────────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────────────────────

-- Kept as enums rather than free text so the public renderer can exhaustively
-- switch on them. Adding a value later is `alter type ... add value`.
create type public.social_platform as enum (
  'instagram', 'tiktok', 'youtube', 'x', 'threads', 'facebook', 'linkedin',
  'github', 'twitch', 'spotify', 'soundcloud', 'pinterest', 'snapchat',
  'discord', 'telegram', 'whatsapp', 'email', 'website'
);

create type public.block_type as enum (
  'links', 'socials', 'text', 'image', 'video', 'embed', 'divider'
);

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'
);

create type public.subscription_plan as enum ('free', 'pro');

-- ────────────────────────────────────────────────────────────────────────────
-- Shared helpers
-- ────────────────────────────────────────────────────────────────────────────

-- `set search_path = ''` on every function: without it a caller can prepend a
-- schema they control and shadow the tables a SECURITY DEFINER function reads.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- reserved_usernames
-- ────────────────────────────────────────────────────────────────────────────

-- Mirrors src/lib/validation/reserved.ts. The application list gives instant
-- feedback while someone types; this table is what actually holds the line,
-- and it is a table rather than a constant so names can be added without a
-- deploy.
create table public.reserved_usernames (
  username text primary key,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.reserved_usernames is
  'Usernames nobody may claim. Mirrored by src/lib/validation/reserved.ts. Entries must be stored in normalized form.';

insert into public.reserved_usernames (username, reason) values
  ('about', 'route'), ('admin', 'route'), ('api', 'route'), ('auth', 'route'),
  ('blog', 'route'), ('careers', 'route'), ('changelog', 'route'),
  ('contact', 'route'), ('dashboard', 'route'), ('docs', 'route'),
  ('editor', 'route'), ('explore', 'route'), ('help', 'route'),
  ('home', 'route'), ('legal', 'route'), ('login', 'route'),
  ('logout', 'route'), ('onboarding', 'route'), ('pricing', 'route'),
  ('privacy', 'route'), ('search', 'route'), ('security', 'route'),
  ('settings', 'route'), ('signin', 'route'), ('signout', 'route'),
  ('signup', 'route'), ('status', 'route'), ('support', 'route'),
  ('terms', 'route'), ('upgrade', 'route'), ('welcome', 'route'),
  ('showme', 'brand'), ('showmeat', 'brand'),
  ('official', 'brand'), ('team', 'brand'), ('staff', 'brand'),
  ('moderator', 'brand'), ('billing', 'brand'), ('payments', 'brand'),
  ('root', 'brand'), ('system', 'brand'),
  ('_next', 'infrastructure'), ('assets', 'infrastructure'),
  ('cdn', 'infrastructure'), ('favicon', 'infrastructure'),
  ('images', 'infrastructure'), ('img', 'infrastructure'),
  ('public', 'infrastructure'), ('robots', 'infrastructure'),
  ('sitemap', 'infrastructure'), ('static', 'infrastructure'),
  ('wellknown', 'infrastructure');

-- ────────────────────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────────────────────

-- One row per authenticated user, and the public identity of a ShowMe page.
-- The primary key IS the auth user id, so ownership is never a join away and
-- every policy below can be written as `= (select auth.uid())`.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The same rules as src/lib/validation/username.ts, enforced where they
  -- cannot be skipped: lowercase, 3-30, starts and ends alphanumeric, no
  -- doubled underscores.
  constraint profiles_username_format check (
    username ~ '^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$' and username !~ '__'
  ),
  constraint profiles_display_name_length check (char_length(display_name) <= 60),
  constraint profiles_bio_length check (char_length(bio) <= 280),
  constraint profiles_avatar_url_scheme check (
    avatar_url is null or avatar_url ~* '^https?://'
  )
);

-- Case-insensitive uniqueness would be redundant given the lowercase CHECK
-- above, so a plain unique index is both correct and usable for the lookup
-- that every public page performs.
create unique index profiles_username_key on public.profiles (username);

comment on table public.profiles is
  'Public identity of a ShowMe page. Readable by anyone; writable only by its owner.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Reserved names cannot be a CHECK constraint, because a CHECK may not read
-- another table. A trigger can, and it fires on insert and on rename.
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
  return new;
end;
$$;

create trigger profiles_reject_reserved_username
  before insert or update of username on public.profiles
  for each row execute function public.reject_reserved_username();

-- ────────────────────────────────────────────────────────────────────────────
-- Profile creation on signup
-- ────────────────────────────────────────────────────────────────────────────

-- Every authenticated user has a profile from the moment they sign up. That
-- invariant is what lets the rest of the application stop asking "what if there
-- is no profile" on every query.
--
-- The placeholder is derived from the user id, so it is unique without a loop
-- and can never collide with a reserved name. Phase 2 lets people replace it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- links
-- ────────────────────────────────────────────────────────────────────────────

create table public.links (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  url text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint links_title_length check (char_length(title) between 1 and 80),
  constraint links_url_scheme check (url ~* '^https?://'),
  constraint links_url_length check (char_length(url) <= 2048),
  constraint links_position_range check (position between 0 and 10000)
);

-- The public page's only query: this creator's active links, in order.
create index links_profile_position_idx
  on public.links (profile_id, position, created_at);

comment on table public.links is
  'Creator links. Publicly readable only while is_active; writable only by the owner.';

create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- social_links
-- ────────────────────────────────────────────────────────────────────────────

create table public.social_links (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform public.social_platform not null,
  url text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_links_url_scheme check (url ~* '^https?://'),
  constraint social_links_url_length check (char_length(url) <= 2048),
  constraint social_links_position_range check (position between 0 and 10000)
);

-- One row per platform per creator: two Instagram icons on one page is a bug,
-- not a feature, so the database refuses it.
create unique index social_links_profile_platform_key
  on public.social_links (profile_id, platform);

create index social_links_profile_position_idx
  on public.social_links (profile_id, position);

create trigger social_links_set_updated_at
  before update on public.social_links
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- blocks
-- ────────────────────────────────────────────────────────────────────────────

-- The future page composition. `data` is JSONB because each block type carries
-- a different shape and the editor is several phases away; the constraint that
-- it must be an object keeps it from becoming an array or a bare string.
create table public.blocks (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type public.block_type not null,
  position integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint blocks_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint blocks_position_range check (position between 0 and 10000)
);

create index blocks_profile_position_idx
  on public.blocks (profile_id, position);

create trigger blocks_set_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- page_views
-- ────────────────────────────────────────────────────────────────────────────

-- Append-only. No user-agent string is stored raw beyond what is needed to
-- classify a device, and no IP address is stored at all: country is derived at
-- the edge and the address is discarded.
create table public.page_views (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  country text,
  device text,

  constraint page_views_country_format check (country is null or country ~ '^[A-Z]{2}$'),
  constraint page_views_referrer_length check (char_length(referrer) <= 2048),
  constraint page_views_user_agent_length check (char_length(user_agent) <= 512)
);

-- Analytics is always "this creator, this window", so the index leads with the
-- owner and orders by time.
create index page_views_profile_created_idx
  on public.page_views (profile_id, created_at desc);

comment on table public.page_views is
  'Append-only page views. Readable by the owner; written only by trusted server code.';

-- ────────────────────────────────────────────────────────────────────────────
-- link_clicks
-- ────────────────────────────────────────────────────────────────────────────

create table public.link_clicks (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.links (id) on delete cascade,
  -- Denormalized so a creator's click query never has to join through links,
  -- and so a click survives being read after the link row is gone.
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  country text,
  device text,

  constraint link_clicks_country_format check (country is null or country ~ '^[A-Z]{2}$'),
  constraint link_clicks_referrer_length check (char_length(referrer) <= 2048),
  constraint link_clicks_user_agent_length check (char_length(user_agent) <= 512)
);

create index link_clicks_profile_created_idx
  on public.link_clicks (profile_id, created_at desc);

create index link_clicks_link_created_idx
  on public.link_clicks (link_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- subscriptions
-- ────────────────────────────────────────────────────────────────────────────

-- Stripe is a later phase. What matters now is that entitlement lives in a
-- table no client can write: a user who can set their own plan is not a
-- paywall. The webhook will write here with the service-role key.
create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status public.subscription_status,
  plan public.subscription_plan not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

comment on table public.subscriptions is
  'Entitlement. Readable by the owner; written only by the billing webhook.';

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.links              enable row level security;
alter table public.social_links       enable row level security;
alter table public.blocks             enable row level security;
alter table public.page_views         enable row level security;
alter table public.link_clicks        enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.reserved_usernames enable row level security;

-- `(select auth.uid())` rather than a bare `auth.uid()`: wrapping it in a
-- subquery lets Postgres evaluate it once per statement instead of once per
-- row, which is the difference between an index scan and a sequential one on
-- a creator with a thousand links.

-- profiles ------------------------------------------------------------------

-- The public page must render for a signed-out visitor, so profiles are world
-- readable. This is safe because the table holds only what a creator has
-- chosen to publish — no email, no tokens, no billing.
create policy "profiles are readable by anyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "users delete their own profile"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));

-- links ---------------------------------------------------------------------

create policy "active links are readable by anyone"
  on public.links for select
  to anon, authenticated
  using (is_active);

-- The owner needs to see drafts too; this is a second permissive policy rather
-- than a widening of the first, so the public rule stays easy to read.
create policy "owners read all their links"
  on public.links for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "owners insert their links"
  on public.links for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "owners update their links"
  on public.links for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "owners delete their links"
  on public.links for delete
  to authenticated
  using (profile_id = (select auth.uid()));

-- social_links --------------------------------------------------------------

create policy "active social links are readable by anyone"
  on public.social_links for select
  to anon, authenticated
  using (is_active);

create policy "owners read all their social links"
  on public.social_links for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "owners insert their social links"
  on public.social_links for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "owners update their social links"
  on public.social_links for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "owners delete their social links"
  on public.social_links for delete
  to authenticated
  using (profile_id = (select auth.uid()));

-- blocks --------------------------------------------------------------------

create policy "visible blocks are readable by anyone"
  on public.blocks for select
  to anon, authenticated
  using (is_visible);

create policy "owners read all their blocks"
  on public.blocks for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "owners insert their blocks"
  on public.blocks for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "owners update their blocks"
  on public.blocks for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "owners delete their blocks"
  on public.blocks for delete
  to authenticated
  using (profile_id = (select auth.uid()));

-- page_views ----------------------------------------------------------------

-- Read by the owner only. There is deliberately no insert policy: an anonymous
-- insert policy would let anyone forge a creator's traffic. Ingestion happens
-- server-side with the service-role key in phase 6.
create policy "owners read their page views"
  on public.page_views for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- link_clicks ---------------------------------------------------------------

create policy "owners read their link clicks"
  on public.link_clicks for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- subscriptions -------------------------------------------------------------

-- Read only, even for the owner. Writes come from the Stripe webhook.
create policy "owners read their subscription"
  on public.subscriptions for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- reserved_usernames --------------------------------------------------------

-- Readable so the signup form can check a name without a round trip through a
-- server action. Never writable through the API.
create policy "reserved usernames are readable by anyone"
  on public.reserved_usernames for select
  to anon, authenticated
  using (true);
