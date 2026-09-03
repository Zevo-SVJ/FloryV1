-- ShowMe — analytics that a creator can trust
--
-- Phase 1 created `page_views` and `link_clicks` and left them empty, with a
-- note that ingestion would arrive in Phase 6. This is Phase 6, and reading
-- those tables back with an implementation in mind turns up three problems and
-- one privacy decision worth making before a single row exists.
--
--   1. `link_clicks.link_id` cascades on delete. A creator who removes a link —
--      or removes the links block around it, which the editor does routinely —
--      would silently destroy every click that link ever received. Analytics
--      must survive the content it describes.
--
--   2. Both tables store a raw `user_agent` up to 512 characters. Nothing needs
--      it: the dashboard shows a device category, and a full UA string is a
--      high-entropy value that belongs to a visitor rather than to a creator.
--      It is removed rather than left as a column somebody will one day fill.
--
--   3. Both store a raw `referrer` up to 2048 characters. A referrer URL can
--      carry a path, a query string and occasionally something personal. The
--      dashboard needs "Instagram", not the URL — so a normalized source and,
--      at most, a hostname are stored instead.
--
-- The privacy decision: unique visitors are estimated from a daily-rotating
-- salted hash and nothing else. No cookie, no fingerprint, no identifier that
-- outlives a day or crosses a page. See `src/lib/analytics/visitor.ts`.
--
-- Row Level Security is unchanged and remains exactly right: owners may SELECT
-- their own rows, nobody may INSERT through the API, and ingestion happens
-- server-side with the service-role key. An anonymous insert policy would let
-- anybody forge a creator's traffic, which is the one thing analytics must not
-- allow.

-- ────────────────────────────────────────────────────────────────────────────
-- Dimensions
-- ────────────────────────────────────────────────────────────────────────────

-- A closed set, because the dashboard renders one row per value and an
-- unexpected one would be a category nobody designed. `unknown` is a real
-- answer rather than a null: a visitor whose device we could not classify is
-- still a visitor, and counting them as absent would quietly deflate totals.
create type public.analytics_device as enum ('mobile', 'tablet', 'desktop', 'unknown');

-- ────────────────────────────────────────────────────────────────────────────
-- page_views
-- ────────────────────────────────────────────────────────────────────────────

alter table public.page_views
  drop constraint page_views_user_agent_length,
  drop constraint page_views_referrer_length,
  drop column user_agent,
  drop column referrer;

alter table public.page_views
  -- The normalized traffic source: `instagram`, `google`, `direct`, `other`.
  -- Text rather than an enum so a source can be added in
  -- `src/lib/analytics/sources.ts` without a migration; the CHECK keeps it to
  -- the shape of an identifier so it can never be a URL in disguise.
  add column source text not null default 'direct',
  -- Only for the `other` bucket, so a creator can see *which* other. A host,
  -- never a path or a query string.
  add column referrer_host text,
  -- A daily-rotating salted hash. Never an IP address, never stored anywhere
  -- else, and useless the following day.
  add column visitor_hash text,
  add constraint page_views_source_format check (source ~ '^[a-z0-9_]{1,32}$'),
  add constraint page_views_referrer_host_length check (char_length(referrer_host) <= 255),
  add constraint page_views_visitor_hash_format check (visitor_hash ~ '^[0-9a-f]{32}$');

-- `using` rather than a default cast: the column is text today and every value
-- in it must land on a member of the enum or the migration should fail loudly.
alter table public.page_views
  alter column device drop default,
  alter column device type public.analytics_device
    using coalesce(device, 'unknown')::public.analytics_device,
  alter column device set not null,
  alter column device set default 'unknown';

comment on table public.page_views is
  'Append-only page views. Readable by the owner; written only by trusted server code. Holds no IP address, no user agent and no referrer URL.';

-- ────────────────────────────────────────────────────────────────────────────
-- link_clicks
-- ────────────────────────────────────────────────────────────────────────────

alter table public.link_clicks
  drop constraint link_clicks_user_agent_length,
  drop constraint link_clicks_referrer_length,
  drop column user_agent,
  drop column referrer;

-- The fix that matters most in this file.
--
-- `on delete cascade` meant that deleting a link deleted its history, and the
-- editor deletes links as a matter of course — removing one, or removing the
-- block around it. `set null` keeps the click and forgets only which row it
-- pointed at, and the title snapshot beside it keeps the click legible: a
-- creator sees "Old shop link — 42 clicks", not an anonymous number.
alter table public.link_clicks
  drop constraint link_clicks_link_id_fkey;

alter table public.link_clicks
  alter column link_id drop not null,
  add constraint link_clicks_link_id_fkey
    foreign key (link_id) references public.links (id) on delete set null;

alter table public.link_clicks
  -- Captured at click time, so history survives a rename as well as a delete.
  add column link_title text,
  add column source text not null default 'direct',
  add column referrer_host text,
  add constraint link_clicks_link_title_length check (char_length(link_title) <= 80),
  add constraint link_clicks_source_format check (source ~ '^[a-z0-9_]{1,32}$'),
  add constraint link_clicks_referrer_host_length check (char_length(referrer_host) <= 255);

alter table public.link_clicks
  alter column device drop default,
  alter column device type public.analytics_device
    using coalesce(device, 'unknown')::public.analytics_device,
  alter column device set not null,
  alter column device set default 'unknown';

comment on table public.link_clicks is
  'Append-only link clicks. A click outlives the link it points at: link_id becomes null and link_title keeps it readable.';

-- ────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────────────────────

-- Every dashboard query is "this creator, this window", and both tables
-- already carry `(profile_id, created_at desc)` from Phase 1 — which is the
-- index that matters and the one every function below plans against.
--
-- One more is worth it. Top-links groups clicks by link inside that window,
-- and leading with the profile keeps the scan to one creator's rows.
create index link_clicks_profile_link_idx
  on public.link_clicks (profile_id, link_id);

-- Deliberately no index on `source`, `device` or `country`. Those are grouped
-- *after* the range scan has already narrowed to one creator's window, so an
-- index on them would be three more things to write on every insert and would
-- serve no query. Append-heavy tables pay for every index on the way in.

-- ────────────────────────────────────────────────────────────────────────────
-- Reading analytics
-- ────────────────────────────────────────────────────────────────────────────

-- Five functions, and none of them takes a profile id.
--
-- Every one is `security invoker`, so Row Level Security applies inside it
-- exactly as it would to a query from the application: the only rows any of
-- them can see are the caller's own. That is a stronger guarantee than
-- validating an argument would be, because there is no argument to validate —
-- a creator cannot ask for somebody else's numbers because there is nowhere to
-- put the request.
--
-- They aggregate in the database rather than returning rows for the
-- application to count. A dashboard that fetched every event to sum it would
-- work for a week and fall over in a month.

create or replace function public.analytics_overview(p_from timestamptz, p_to timestamptz)
returns table (views bigint, clicks bigint, visitors bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.page_views v
      where v.created_at >= p_from and v.created_at < p_to),
    (select count(*) from public.link_clicks c
      where c.created_at >= p_from and c.created_at < p_to),
    -- Null-safe by construction: a view with no hash (no salt configured, or
    -- no address available) is counted as a view and not as a visitor, so the
    -- estimate is never inflated by rows it cannot distinguish.
    (select count(distinct v.visitor_hash) from public.page_views v
      where v.created_at >= p_from and v.created_at < p_to
        and v.visitor_hash is not null);
$$;

comment on function public.analytics_overview(timestamptz, timestamptz) is
  'Totals for the calling user''s own page over a window. security invoker: RLS decides whose rows these are.';

-- A row per bucket across the whole window, including the empty ones.
--
-- `generate_series` rather than letting the application fill gaps: a chart with
-- missing days is a chart that lies about its shape, and the database is the
-- only place that knows what a day means in the requested time zone.
create or replace function public.analytics_timeseries(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text
)
returns table (bucket timestamptz, views bigint, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with step as (
    -- Validated to two literals rather than interpolated. `date_trunc` takes a
    -- field name as text, and passing an argument straight into it would be
    -- the one place in this schema where a caller chose a SQL fragment.
    select case when p_bucket = 'hour' then interval '1 hour' else interval '1 day' end as size,
           case when p_bucket = 'hour' then 'hour' else 'day' end as field
  ),
  buckets as (
    select generate_series(
             date_trunc((select field from step), p_from),
             p_to - interval '1 microsecond',
             (select size from step)
           ) as bucket
  )
  select b.bucket,
         (select count(*) from public.page_views v
           where v.created_at >= b.bucket
             and v.created_at < b.bucket + (select size from step)),
         (select count(*) from public.link_clicks c
           where c.created_at >= b.bucket
             and c.created_at < b.bucket + (select size from step))
    from buckets b
   order by b.bucket;
$$;

-- Clicks per link, including links that no longer exist.
--
-- The left join is the point. A deleted link leaves `link_id` null and the
-- title snapshot behind, and a renamed link answers to its current name — so
-- the list reads as the creator's page reads, while nothing is lost.
create or replace function public.analytics_top_links(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 10
)
returns table (link_id uuid, title text, clicks bigint, deleted boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.link_id,
         coalesce(l.title, c.link_title, 'Deleted link'),
         count(*),
         l.id is null
    from public.link_clicks c
    left join public.links l on l.id = c.link_id
   where c.created_at >= p_from and c.created_at < p_to
   group by c.link_id, l.title, c.link_title, l.id
   order by count(*) desc, coalesce(l.title, c.link_title, '') asc
   limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

-- One shape for source, device and country.
--
-- A `case` over three literals rather than dynamic SQL: the dimension is a
-- choice between three columns, and expressing it as one is the difference
-- between a function and a query builder with a caller-supplied fragment in it.
create or replace function public.analytics_breakdown(
  p_from timestamptz,
  p_to timestamptz,
  p_dimension text
)
returns table (key text, views bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select case p_dimension
           when 'source' then v.source
           when 'device' then v.device::text
           when 'country' then coalesce(v.country, 'ZZ')
         end,
         count(*)
    from public.page_views v
   where v.created_at >= p_from and v.created_at < p_to
     and p_dimension in ('source', 'device', 'country')
   group by 1
   order by count(*) desc, 1 asc;
$$;

-- The last few things that happened, and nothing about who did them.
--
-- Deliberately carries no source, device or country. One event with three
-- dimensions on it is a description of a person; the same three dimensions
-- aggregated over a week are a description of an audience, which is what a
-- creator actually needs and all this product will show.
create or replace function public.analytics_recent(p_limit integer default 8)
returns table (kind text, title text, at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  (
    select 'view'::text, null::text, v.created_at
      from public.page_views v
     order by v.created_at desc
     limit greatest(1, least(coalesce(p_limit, 8), 25))
  )
  union all
  (
    select 'click'::text,
           coalesce(l.title, c.link_title, 'Deleted link'),
           c.created_at
      from public.link_clicks c
      left join public.links l on l.id = c.link_id
     order by c.created_at desc
     limit greatest(1, least(coalesce(p_limit, 8), 25))
  )
  order by 3 desc
  limit greatest(1, least(coalesce(p_limit, 8), 25));
$$;

-- Readable by anybody signed in — which, because every one of them is
-- `security invoker`, means "readable about yourself and nobody else".
revoke all on function public.analytics_overview(timestamptz, timestamptz) from public;
revoke all on function public.analytics_timeseries(timestamptz, timestamptz, text) from public;
revoke all on function public.analytics_top_links(timestamptz, timestamptz, integer) from public;
revoke all on function public.analytics_breakdown(timestamptz, timestamptz, text) from public;
revoke all on function public.analytics_recent(integer) from public;

grant execute on function public.analytics_overview(timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_timeseries(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.analytics_top_links(timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.analytics_breakdown(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.analytics_recent(integer) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- A note on `/go`
-- ────────────────────────────────────────────────────────────────────────────

-- `/go/<id>` needs no reserved username to protect it. A username is at least
-- three characters, so `go` is not a name anybody can claim — the parity test
-- in `src/lib/validation/__tests__/validation.test.ts` refuses reserved
-- entries that no username could have been anyway, which is how the attempt to
-- add one here was caught. The route is safe by construction rather than by
-- list, and one fewer entry is one fewer thing to keep in step.
