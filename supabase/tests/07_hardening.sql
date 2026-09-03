-- ShowMe — the production audit, as assertions
--
-- Phase 8 changed three things in the database and claimed a great many more
-- were already true. This suite is the second half of that: every claim the
-- audit made about who can read and write what, checked rather than asserted
-- in a document.
--
-- Most of it duplicates nothing. The earlier suites test each phase's own
-- feature; this one asks the questions an auditor asks — is RLS on everywhere,
-- is there a policy anywhere that grants more than its name suggests, can any
-- role reach a table it has no business in.

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages to notice;

create or replace function pg_temp.ok(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label;
  end if;
end;
$$;

create or replace function pg_temp.denied(statement text, label text)
returns void language plpgsql as $$
declare
  affected integer;
begin
  execute statement;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise notice 'PASS  % [no rows matched]', label;
    return;
  end if;
  raise exception 'FAIL  % — statement changed % row(s)', label, affected;
exception
  when insufficient_privilege or check_violation or unique_violation
    or foreign_key_violation or raise_exception or invalid_text_representation
    or not_null_violation then
    raise notice 'PASS  % [refused: %]', label, sqlerrm;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'zevo@example.com', '{"username":"zevo"}'::jsonb),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', 'rival@example.com', '{"username":"rival"}'::jsonb);

-- ══════════════════════════════════════════════════════════════════════════
-- Row Level Security is on, and no policy is wider than its name
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  unguarded text;
begin
  -- Every table in `public`, without exception. A table added later without
  -- RLS is the single most likely way this product leaks, and it would leak
  -- silently — so the check is "all of them" rather than a list to maintain.
  select string_agg(c.relname, ', ') into unguarded
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  perform pg_temp.ok(unguarded is null,
    'row level security is enabled on every table' ||
    coalesce(' — missing on ' || unguarded, ''));
end
$$;

do $$
declare
  wide text;
begin
  /*
   * A write policy whose USING or WITH CHECK is `true` grants everything. The
   * only unconditional policies in this schema are reads that are meant to be
   * public — profiles, reserved usernames — so anything unconditional on
   * insert, update or delete is a mistake by construction.
   */
  select string_agg(format('%s.%s (%s)', tablename, policyname, cmd), '; ')
    into wide
    from pg_policies
   where schemaname = 'public'
     and cmd <> 'SELECT'
     and (coalesce(qual, 'true') = 'true' and coalesce(with_check, 'true') = 'true');

  perform pg_temp.ok(wide is null,
    'no write policy is unconditional' || coalesce(' — found ' || wide, ''));
end
$$;

do $$
begin
  -- Removed in `20260107000000_hardening.sql`. Nothing in the product deletes
  -- a profile, and leaving the policy let a signed-in user delete their own
  -- row from a console and land in a state the app shell cannot render.
  perform pg_temp.ok(
    not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'profiles'
                   and cmd = 'DELETE'),
    'a profile cannot be deleted through the API by anyone');

  -- The tables written only by the service role have no write policy at all.
  perform pg_temp.ok(
    not exists (select 1 from pg_policies
                 where schemaname = 'public'
                   and tablename in ('page_views', 'link_clicks', 'subscriptions')
                   and cmd <> 'SELECT'),
    'analytics and billing have no write policy for any client');
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- Every function is safe to call
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  unsafe text;
begin
  /*
   * `set search_path = ''` on every function in `public`. Without it a caller
   * can create a schema they control, put it first in their search path, and
   * shadow the tables a SECURITY DEFINER function reads — which is privilege
   * escalation with no exploit code in it.
   */
  select string_agg(p.proname, ', ') into unsafe
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
        where cfg like 'search_path=%'
     );

  perform pg_temp.ok(unsafe is null,
    'every function pins its search_path' || coalesce(' — missing on ' || unsafe, ''));
end
$$;

do $$
declare
  definers text;
begin
  -- Only `handle_new_user` may bypass RLS, and only because it runs as a
  -- trigger on `auth.users` where the caller is the auth system rather than a
  -- person. Everything a creator invokes is `security invoker`.
  select string_agg(p.proname, ', ') into definers
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef;

  perform pg_temp.ok(definers = 'handle_new_user',
    'handle_new_user is the only security definer function — found: ' ||
    coalesce(definers, 'none'));
end
$$;

do $$
declare
  callable text;
begin
  /*
   * `anon` may execute nothing in `public`. The analytics functions revoke it
   * explicitly; this catches a future function that forgets to, since Postgres
   * grants execute to PUBLIC by default and PUBLIC includes `anon`.
   */
  select string_agg(p.proname, ', ') into callable
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')
     -- Trigger functions take no arguments from a caller and return `trigger`;
     -- they are not callable in any meaningful sense.
     and p.prorettype <> 'trigger'::regtype;

  perform pg_temp.ok(callable is null,
    'an anonymous visitor can execute no function' ||
    coalesce(' — found ' || callable, ''));
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- Referential integrity: nothing can be orphaned or reparented
-- ══════════════════════════════════════════════════════════════════════════

do $$
begin
  perform pg_temp.ok(
    (select count(*) from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public' and c.contype = 'f'
       and t.relname in ('links', 'social_links', 'blocks', 'page_views',
                         'link_clicks', 'subscriptions')
       and c.confrelid = 'public.profiles'::regclass) = 6,
    'every owned table has a foreign key to the profile that owns it');

  -- A click outlives its link. Phase 6 changed this from `cascade`, and a
  -- future migration flipping it back would silently delete history.
  perform pg_temp.ok(
    (select confdeltype from pg_constraint
      where conname = 'link_clicks_link_id_fkey') = 'n',
    'deleting a link sets its clicks'' link_id to null rather than deleting them');

  perform pg_temp.ok(
    (select count(*) from pg_constraint
      where conrelid = 'public.links'::regclass
        and contype = 'f' and confdeltype = 'c') = 2,
    'a link is deleted with the profile and the block it belongs to');
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- The claims the audit made about a stranger
-- ══════════════════════════════════════════════════════════════════════════

set role anon;
select set_config('request.jwt.claims', 'null', false);

do $$
begin
  perform pg_temp.ok(
    (select count(*) from public.profiles) = 2,
    'a stranger reads profiles, because the public page must render for one');

  perform pg_temp.denied($stmt$
    update public.profiles set bio = 'defaced'
  $stmt$, 'a stranger cannot write to a profile');

  perform pg_temp.denied($stmt$
    delete from public.profiles
  $stmt$, 'a stranger cannot delete a profile');

  perform pg_temp.ok(
    (select count(*) from public.page_views) = 0
      and (select count(*) from public.link_clicks) = 0
      and (select count(*) from public.subscriptions) = 0,
    'a stranger reads no analytics and no billing');

  perform pg_temp.denied($stmt$
    insert into auth.users (id, email) values (gen_random_uuid(), 'x@example.com')
  $stmt$, 'a stranger cannot reach the auth schema');
end
$$;

reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- And about one creator looking at another
-- ══════════════════════════════════════════════════════════════════════════

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"7c02e9b4-51aa-4c37-8f60-000000000002"}', false);

do $$
begin
  perform pg_temp.denied($stmt$
    update public.profiles set bio = 'defaced'
     where id = '0a5e7d31-64bc-4e02-9c88-000000000001'
  $stmt$, 'a creator cannot edit another creator''s profile');

  perform pg_temp.denied($stmt$
    delete from public.profiles
     where id = '0a5e7d31-64bc-4e02-9c88-000000000001'
  $stmt$, 'nor delete it');

  perform pg_temp.denied($stmt$
    update public.profiles set id = '0a5e7d31-64bc-4e02-9c88-000000000001'
     where id = '7c02e9b4-51aa-4c37-8f60-000000000002'
  $stmt$, 'nor become them by rewriting their own id');

  perform pg_temp.denied($stmt$
    insert into public.subscriptions (profile_id, plan)
    values ('7c02e9b4-51aa-4c37-8f60-000000000002', 'pro')
  $stmt$, 'nor grant themselves a paid plan');

  perform pg_temp.ok(
    (select count(*) from public.page_views) = 0,
    'and reads none of another creator''s analytics');
end
$$;

reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- The indexes the audit added
-- ══════════════════════════════════════════════════════════════════════════

do $$
begin
  perform pg_temp.ok(
    (select count(*) from pg_indexes
      where schemaname = 'public'
        and indexname in ('page_views_profile_created_dimensions_idx',
                          'link_clicks_profile_created_link_idx',
                          'links_live_lookup_idx')) = 3,
    'the covering indexes for analytics and the live-link lookup exist');

  -- Every table analytics reads is indexed by owner and time, which is the
  -- only shape any of those queries has.
  perform pg_temp.ok(
    exists (select 1 from pg_indexes where schemaname = 'public'
             and tablename = 'page_views' and indexdef like '%profile_id, created_at%')
      and exists (select 1 from pg_indexes where schemaname = 'public'
                   and tablename = 'link_clicks' and indexdef like '%profile_id, created_at%'),
    'analytics is indexed by owner and time on both event tables');
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- The time series counts once, and still counts correctly
-- ══════════════════════════════════════════════════════════════════════════

-- `analytics_timeseries` was rewritten in this phase from two correlated
-- subqueries per bucket to one grouped pass per table. The rewrite is only
-- worth having if the numbers are identical, so these assertions place events
-- at known instants and insist they land in the bucket they belong to — the
-- boundary cases included, since a half-open window is exactly where a rewrite
-- like this goes wrong.

set role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001","role":"authenticated"}',
  false);

insert into public.blocks (id, profile_id, type, position)
values ('b1000000-0000-4000-8000-000000000001',
        '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 0);

insert into public.links (id, profile_id, block_id, title, url, position)
values ('c1000000-0000-4000-8000-000000000001',
        '0a5e7d31-64bc-4e02-9c88-000000000001',
        'b1000000-0000-4000-8000-000000000001',
        'Shop', 'https://example.com', 0);

-- Three views: one at the very start of yesterday, one at its very last
-- microsecond, one an hour into today. And one click, today.
set role service_role;
insert into public.page_views (profile_id, created_at) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', date_trunc('day', now()) - interval '1 day'),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', date_trunc('day', now()) - interval '1 microsecond'),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', date_trunc('day', now()) + interval '1 hour');

insert into public.link_clicks (profile_id, link_id, link_title, created_at) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001',
   'c1000000-0000-4000-8000-000000000001', 'Shop',
   date_trunc('day', now()) + interval '1 hour');

set role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001","role":"authenticated"}',
  false);

do $$
declare
  yesterday timestamptz := date_trunc('day', now()) - interval '1 day';
  today timestamptz := date_trunc('day', now());
begin
  perform pg_temp.ok(
    (select views from public.analytics_timeseries(yesterday, now(), 'day')
      where bucket = yesterday) = 2,
    'both of yesterday''s views land in yesterday, including the one a microsecond before midnight');

  perform pg_temp.ok(
    (select views from public.analytics_timeseries(yesterday, now(), 'day')
      where bucket = today) = 1,
    'a view an hour into today lands in today, not in yesterday');

  perform pg_temp.ok(
    (select clicks from public.analytics_timeseries(yesterday, now(), 'day')
      where bucket = today) = 1,
    'clicks are bucketed by the same rule as views');

  perform pg_temp.ok(
    (select coalesce(sum(views), 0) from public.analytics_timeseries(yesterday, now(), 'day')) = 3
      and (select coalesce(sum(clicks), 0)
             from public.analytics_timeseries(yesterday, now(), 'day')) = 1,
    'the buckets add up to everything inside the window and nothing outside it');

  -- An empty bucket is still a row: a chart with missing days lies about its
  -- shape, and the left join is what keeps them.
  perform pg_temp.ok(
    (select count(*) from public.analytics_timeseries(
       now() - interval '7 days', now(), 'day')) between 7 and 8,
    'empty days are still rows after the rewrite');

  perform pg_temp.ok(
    (select views from public.analytics_timeseries(today, now(), 'hour')
      where bucket = today + interval '1 hour') = 1,
    'hourly buckets still work, and put the view in its own hour');

  -- The window is half-open at both ends, which is what stops a total from
  -- disagreeing with the sum of its days.
  perform pg_temp.ok(
    (select coalesce(sum(views), 0)
       from public.analytics_timeseries(today, today + interval '1 hour', 'hour')) = 0,
    'a view at exactly the end of a window is outside it');

  -- ── Where the chart begins ──────────────────────────────────────────────
  --
  -- All time starts at the epoch. Without the flag that is fifty-five years
  -- of empty columns; with it the series starts at the first thing that
  -- happened, and the totals are identical either way — which is the property
  -- that makes it a presentation choice rather than a filter.
  perform pg_temp.ok(
    (select count(*) from public.analytics_timeseries(
       'epoch'::timestamptz, now(), 'day', true)) = 2,
    'from the first event, All time is exactly as long as the history is');

  perform pg_temp.ok(
    (select count(*) from public.analytics_timeseries(
       'epoch'::timestamptz, now(), 'day', false)) > 19000,
    'without the flag the same window is every day since the epoch');

  perform pg_temp.ok(
    (select coalesce(sum(views), 0) from public.analytics_timeseries(
       'epoch'::timestamptz, now(), 'day', true))
      = (select coalesce(sum(views), 0) from public.analytics_timeseries(
           'epoch'::timestamptz, now(), 'day', false)),
    'trimming the empty years changes where the chart starts and nothing else');

  -- Defaulted, so a caller that says nothing gets the old behaviour.
  perform pg_temp.ok(
    (select count(*) from public.analytics_timeseries(yesterday, now(), 'day'))
      = (select count(*) from public.analytics_timeseries(yesterday, now(), 'day', false)),
    'the flag defaults to off');

  -- An empty window has no first event to start at, so the full bucket list
  -- is still what comes back — a seven-day chart of nothing is seven days.
  perform pg_temp.ok(
    (select count(*) from public.analytics_timeseries(
       now() + interval '1 day', now() + interval '8 days', 'day', true))
      = (select count(*) from public.analytics_timeseries(
           now() + interval '1 day', now() + interval '8 days', 'day', false)),
    'with nothing in the window the flag changes nothing');
end
$$;

reset role;

do $$
begin
  raise notice '';
  raise notice 'All hardening assertions passed.';
end
$$;
