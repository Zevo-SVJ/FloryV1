-- ShowMe — production hardening
--
-- Three changes, each closing something the audit found rather than adding a
-- feature. None of them touches creator data.

-- ────────────────────────────────────────────────────────────────────────────
-- A profile is not a row a client may delete
-- ────────────────────────────────────────────────────────────────────────────

-- Phase 1 gave `profiles` the same four policies as every other owned table,
-- by symmetry rather than by need. Nothing in the product deletes a profile:
-- the row is created by a trigger on `auth.users` and removed by the cascade
-- when that account is deleted, which is the only correct way for it to go.
--
-- Leaving the policy in place meant a signed-in user could delete their own
-- profile from a browser console with the anon key, and land in a state the
-- rest of the schema says is impossible — an authenticated session with no
-- profile row, which the app shell then cannot render. Removing it makes
-- "every authenticated user has exactly one profile" an invariant instead of
-- a convention.
--
-- Account deletion, when it ships, deletes the auth user and the cascade does
-- the rest. That path does not need this policy and never did.
drop policy "users delete their own profile" on public.profiles;

-- ────────────────────────────────────────────────────────────────────────────
-- Analytics reads that stay fast as history grows
-- ────────────────────────────────────────────────────────────────────────────

-- `analytics_breakdown` groups by source, device or country inside a window,
-- and `analytics_overview` counts distinct visitor hashes in one. Both scan
-- `(profile_id, created_at)` — which is indexed — and then read columns the
-- index does not carry, so every matching row is a heap fetch.
--
-- Covering indexes turn those into index-only scans. On a creator with a few
-- hundred views the difference is nothing; on one with a year of traffic it is
-- the difference between a dashboard that opens and one that thinks about it.
-- The cost is two indexes on append-only tables that are never updated.
create index page_views_profile_created_dimensions_idx
  on public.page_views (profile_id, created_at desc)
  include (source, device, country, visitor_hash);

create index link_clicks_profile_created_link_idx
  on public.link_clicks (profile_id, created_at desc)
  include (link_id, link_title);

-- ────────────────────────────────────────────────────────────────────────────
-- The schedule window, in the index that answers it
-- ────────────────────────────────────────────────────────────────────────────

-- Every public read of a link is "this creator's links, in order, that are
-- live right now". The existing index leads with `profile_id` and `position`;
-- this one is partial on `is_active` and carries the two window columns, so
-- the policy's predicate is answered from the index rather than by fetching
-- rows that are then discarded.
create index links_live_lookup_idx
  on public.links (profile_id, position, created_at)
  include (starts_at, ends_at)
  where is_active;

-- ────────────────────────────────────────────────────────────────────────────
-- An anonymous visitor may execute nothing
-- ────────────────────────────────────────────────────────────────────────────

-- Postgres grants EXECUTE on a new function to PUBLIC, and PUBLIC includes
-- `anon`. The analytics functions revoke it explicitly; the four username
-- helpers from Phase 2 never did, because nothing draws attention to a default.
--
-- None of them is dangerous on its own — they normalize and validate text —
-- but "an anonymous caller can execute nothing" is a rule worth being able to
-- state without exceptions, and `supabase/tests/07_hardening.sql` now asserts
-- it for every function in the schema. A future helper that forgets to revoke
-- fails that assertion instead of quietly widening the surface.
--
-- `authenticated` keeps them: the CHECK constraint on `profiles.username` and
-- the `security invoker` rename guard both evaluate as the caller, and that
-- caller is a signed-in creator.
revoke execute on function public.normalize_username(text) from public;
revoke execute on function public.username_is_valid(text) from public;
revoke execute on function public.placeholder_username(uuid) from public;
revoke execute on function public.is_placeholder_username(text) from public;

grant execute on function public.normalize_username(text) to authenticated;
grant execute on function public.username_is_valid(text) to authenticated;
grant execute on function public.placeholder_username(uuid) to authenticated;
grant execute on function public.is_placeholder_username(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- The time series, counted once instead of once per bucket
-- ────────────────────────────────────────────────────────────────────────────

-- Same rows, same security, one more argument. What changes is the shape of
-- the work.
--
-- The Phase 6 version ran two correlated subqueries for every bucket in the
-- window: one over `page_views`, one over `link_clicks`. That is fine at
-- twenty-four buckets and quietly quadratic in the thing that grows — the
-- window. On the All-time tab, whose window starts at the epoch, it meant
-- twenty thousand buckets and forty thousand index scans, and the page took
-- four seconds against a fixture of four thousand views while every other
-- range took fifty milliseconds. Counting each table once instead brings the
-- same twenty thousand buckets to about seven.
--
-- `p_from_first_event` is the second half. A chart of All time should begin at
-- a creator''s first view, not in 1970, and the difference is not something
-- this function can infer: for a seven-day window the leading empty days are
-- the point — "you had nothing on Monday" is information — while for All time
-- they are fifty-five years of nothing. So the caller says which it means,
-- and `getSeries` passes true for exactly one range. With no events in the
-- window the flag does nothing, because there is no first event to start at
-- and the full bucket list is still the honest answer.
--
-- Truncation and the series step have to agree about where a bucket begins,
-- and they do for the same reason they did before: the series starts on a
-- `date_trunc` boundary and steps by exactly the interval the grouping
-- truncates to. Both read the session''s time zone, which on Supabase is UTC —
-- the one arrangement in which a day is always the same length. That was
-- already true of the version this replaces; it is written down here because
-- the join now depends on it exactly rather than approximately.
--
-- `security invoker` and the empty `search_path` are unchanged, so Row Level
-- Security still decides whose rows are counted and no unqualified name can be
-- resolved from a caller''s path.
--
-- Dropped rather than replaced: the argument list changed, and `create or
-- replace` would leave the three-argument version in place beside it, so a
-- three-argument call would be ambiguous rather than resolved.
drop function if exists public.analytics_timeseries(timestamptz, timestamptz, text);

create function public.analytics_timeseries(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text,
  p_from_first_event boolean default false
)
returns table (bucket timestamptz, views bigint, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with step as (
    -- Still validated to two literals rather than interpolated: `date_trunc`
    -- takes a field name as text, and a caller must never choose it.
    select case when p_bucket = 'hour' then interval '1 hour' else interval '1 day' end as size,
           case when p_bucket = 'hour' then 'hour' else 'day' end as field
  ),
  seen as (
    select date_trunc((select field from step), v.created_at) as bucket, count(*) as n
      from public.page_views v
     where v.created_at >= p_from and v.created_at < p_to
     group by 1
  ),
  clicked as (
    select date_trunc((select field from step), c.created_at) as bucket, count(*) as n
      from public.link_clicks c
     where c.created_at >= p_from and c.created_at < p_to
     group by 1
  ),
  -- The first bucket that holds anything, on either table. Null when the
  -- window is empty, which is how `coalesce` below falls back to `p_from`.
  first_event as (
    select min(bucket) as bucket
      from (select bucket from seen union all select bucket from clicked) both_of_them
  ),
  buckets as (
    select generate_series(
             case
               when p_from_first_event
                 then coalesce((select bucket from first_event),
                               date_trunc((select field from step), p_from))
               else date_trunc((select field from step), p_from)
             end,
             p_to - interval '1 microsecond',
             (select size from step)
           ) as bucket
  )
  select b.bucket,
         coalesce(seen.n, 0),
         coalesce(clicked.n, 0)
    from buckets b
    left join seen on seen.bucket = b.bucket
    left join clicked on clicked.bucket = b.bucket
   order by b.bucket;
$$;

comment on function public.analytics_timeseries(timestamptz, timestamptz, text, boolean) is
  'A row per bucket across a window, empty ones included. p_from_first_event starts the series at the first bucket that holds anything, for a window that means "everything". security invoker: RLS decides whose events are counted.';

revoke all on function public.analytics_timeseries(timestamptz, timestamptz, text, boolean) from public;
grant execute on function public.analytics_timeseries(timestamptz, timestamptz, text, boolean) to authenticated;
