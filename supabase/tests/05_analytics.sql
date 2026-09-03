-- ShowMe — analytics, and who is allowed to see them
--
-- Analytics are the most private thing in this product. A creator's traffic is
-- commercially sensitive, and the tables holding it are written by a path that
-- bypasses Row Level Security — so the questions worth asking are: can anybody
-- read somebody else's numbers, can anybody write a row through the API, and
-- does a creator's own history survive them editing their page.

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
  -- `invalid_text_representation` is here where the other suites do not need
  -- it: `device` is an enum, so a value outside the four categories is refused
  -- by the type system before any constraint is consulted. That is a stronger
  -- refusal than a CHECK, and it should still count as one.
  when insufficient_privilege or check_violation or unique_violation
    or foreign_key_violation or raise_exception or invalid_text_representation then
    raise notice 'PASS  % [refused: %]', label, sqlerrm;
end;
$$;

-- ── Two creators, each with a page and some history ───────────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'zevo@example.com', '{"username":"zevo"}'::jsonb),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', 'rival@example.com', '{"username":"rival"}'::jsonb);

insert into public.blocks (id, profile_id, type, position) values
  ('b0000000-0000-4000-8000-000000000001',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 0),
  ('b0000000-0000-4000-8000-000000000002',
   '7c02e9b4-51aa-4c37-8f60-000000000002', 'links', 0);

insert into public.links (id, profile_id, block_id, title, url, position) values
  ('11111111-0000-4000-8000-000000000001',
   '0a5e7d31-64bc-4e02-9c88-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Instagram', 'https://instagram.com/8zevo', 0),
  ('11111111-0000-4000-8000-000000000002',
   '0a5e7d31-64bc-4e02-9c88-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Website', 'https://example.com', 1),
  ('22222222-0000-4000-8000-000000000001',
   '7c02e9b4-51aa-4c37-8f60-000000000002',
   'b0000000-0000-4000-8000-000000000002', 'Rival link', 'https://rival.example', 0);

-- Views across two days and three sources, so the aggregates have something
-- to aggregate and the window boundaries have something to exclude.
insert into public.page_views (profile_id, created_at, source, device, country, visitor_hash) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', now() - interval '1 hour', 'instagram', 'mobile', 'FR', repeat('a', 32)),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', now() - interval '2 hours', 'instagram', 'mobile', 'FR', repeat('a', 32)),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', now() - interval '3 hours', 'tiktok', 'desktop', 'US', repeat('b', 32)),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', now() - interval '3 days', 'direct', 'tablet', null, null),
  -- Well outside every window the dashboard offers except "all time".
  ('0a5e7d31-64bc-4e02-9c88-000000000001', now() - interval '200 days', 'google', 'mobile', 'GB', repeat('c', 32)),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', now() - interval '1 hour', 'google', 'desktop', 'DE', repeat('d', 32));

insert into public.link_clicks (profile_id, link_id, link_title, created_at, source, device, country) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', '11111111-0000-4000-8000-000000000001', 'Instagram', now() - interval '30 minutes', 'instagram', 'mobile', 'FR'),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', '11111111-0000-4000-8000-000000000001', 'Instagram', now() - interval '2 hours', 'instagram', 'mobile', 'FR'),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', '11111111-0000-4000-8000-000000000002', 'Website', now() - interval '3 hours', 'tiktok', 'desktop', 'US'),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', '22222222-0000-4000-8000-000000000001', 'Rival link', now() - interval '1 hour', 'google', 'desktop', 'DE');

-- ── The owner ─────────────────────────────────────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001"}', false);

select pg_temp.ok(
  (select count(*) from public.page_views) = 5,
  'a creator reads their own page views and only their own'
);

select pg_temp.ok(
  (select count(*) from public.link_clicks) = 3,
  'a creator reads their own clicks and only their own'
);

select pg_temp.ok(
  (select views from public.analytics_overview(now() - interval '7 days', now())) = 4
  and (select clicks from public.analytics_overview(now() - interval '7 days', now())) = 3,
  'the overview counts what is inside the window'
);

select pg_temp.ok(
  (select views from public.analytics_overview(now() - interval '7 days', now())) = 4,
  'the overview excludes what is outside the window'
);

select pg_temp.ok(
  (select visitors from public.analytics_overview(now() - interval '7 days', now())) = 2,
  'two views sharing a visitor hash are one visitor, and a null hash is none'
);

select pg_temp.ok(
  (select count(*) from public.analytics_timeseries(
     now() - interval '7 days', now(), 'day')) between 7 and 8,
  'the time series returns a bucket per day, including the empty ones'
);

select pg_temp.ok(
  (select sum(views) from public.analytics_timeseries(
     now() - interval '7 days', now(), 'day')) = 4,
  'the buckets add up to the same total the overview reports'
);

select pg_temp.ok(
  (select title from public.analytics_top_links(now() - interval '7 days', now(), 10)
    order by clicks desc limit 1) = 'Instagram',
  'top links ranks by clicks'
);

select pg_temp.ok(
  (select key from public.analytics_breakdown(now() - interval '7 days', now(), 'source')
    order by views desc limit 1) = 'instagram',
  'the source breakdown groups and orders by volume'
);

select pg_temp.ok(
  (select views from public.analytics_breakdown(now() - interval '7 days', now(), 'device')
    where key = 'mobile') = 2,
  'the device breakdown counts each category'
);

-- A view with no country lands in ZZ rather than vanishing, so the shares add
-- up to a hundred per cent instead of quietly summing to less.
select pg_temp.ok(
  (select views from public.analytics_breakdown(now() - interval '7 days', now(), 'country')
    where key = 'ZZ') = 1,
  'a view with no country is counted as Unknown, not dropped'
);

select pg_temp.ok(
  (select count(*) from public.analytics_breakdown(
     now() - interval '7 days', now(), 'nonsense')) = 0,
  'an unknown dimension returns nothing rather than everything'
);

select pg_temp.ok(
  (select count(*) from public.analytics_recent(10)) = 8,
  'recent activity mixes views and clicks, newest first'
);

-- The newest event is a click and the one before it is a view, so this only
-- passes if the union is ordered as a whole rather than per branch.
select pg_temp.ok(
  (select kind from public.analytics_recent(1)) = 'click',
  'recent activity is ordered across both kinds, not within each'
);

select pg_temp.ok(
  not exists (
    select 1 from (
      select at, lag(at) over (order by at desc) as previous
        from public.analytics_recent(25)
    ) ordered
     where previous is not null and at > previous
  ),
  'and never goes backwards'
);

-- ── Editing a page must not destroy its history ───────────────────────────

delete from public.links where id = '11111111-0000-4000-8000-000000000002';

select pg_temp.ok(
  (select count(*) from public.link_clicks) = 3,
  'deleting a link keeps every click it earned'
);

select pg_temp.ok(
  (select link_id from public.link_clicks where link_title = 'Website') is null,
  'the deleted link''s clicks lose their reference and keep their history'
);

select pg_temp.ok(
  (select title from public.analytics_top_links(now() - interval '7 days', now(), 10)
    where deleted) = 'Website',
  'a deleted link is still named in the dashboard from its title snapshot'
);

-- Deleting the whole block is what the editor does when a section goes, and it
-- cascades to the links inside it. The clicks must still survive that.
delete from public.blocks where id = 'b0000000-0000-4000-8000-000000000001';

select pg_temp.ok(
  (select count(*) from public.links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 0,
  'deleting a links block deletes its links, as it always has'
);

select pg_temp.ok(
  (select count(*) from public.link_clicks) = 3,
  'and takes none of the click history with it'
);

select pg_temp.ok(
  (select sum(clicks) from public.analytics_top_links(
     now() - interval '7 days', now(), 10)) = 3,
  'every click is still attributed after the page that produced it is gone'
);

-- ── Nobody may write through the API ──────────────────────────────────────
--
-- There is no insert policy on either table and there never will be. An
-- anonymous insert policy would let anybody forge a creator's traffic, which
-- would make every number in the dashboard worth nothing.

select pg_temp.denied(
  $$insert into public.page_views (profile_id) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001')$$,
  'a signed-in creator cannot insert their own page views'
);

select pg_temp.denied(
  $$insert into public.link_clicks (profile_id, link_id) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001', null)$$,
  'a signed-in creator cannot insert their own clicks'
);

select pg_temp.denied(
  $$update public.page_views set country = 'FR' where profile_id is not null$$,
  'a creator cannot rewrite their own history'
);

select pg_temp.denied(
  $$delete from public.page_views where profile_id is not null$$,
  'a creator cannot delete their own history through the API'
);

reset role;

-- ── One creator, and somebody else's numbers ──────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"7c02e9b4-51aa-4c37-8f60-000000000002"}', false);

select pg_temp.ok(
  (select count(*) from public.page_views) = 1,
  'a creator sees only their own views, never a rival''s'
);

select pg_temp.ok(
  (select views from public.analytics_overview(now() - interval '365 days', now())) = 1,
  'the overview cannot be pointed at another creator — it takes no id at all'
);

select pg_temp.ok(
  (select count(*) from public.analytics_top_links(
     now() - interval '365 days', now(), 50)) = 1,
  'top links is scoped by RLS, not by an argument'
);

select pg_temp.ok(
  not exists (
    select 1 from public.analytics_recent(25) where title = 'Instagram'
  ),
  'recent activity never leaks another creator''s events'
);

select pg_temp.denied(
  $$update public.page_views set country = 'ZZ'
      where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001'$$,
  'a creator cannot tamper with a rival''s analytics'
);

reset role;

-- ── The visitor with no session ───────────────────────────────────────────

set role anon;

select pg_temp.ok(
  (select count(*) from public.page_views) = 0,
  'a stranger reads no page views at all'
);

select pg_temp.ok(
  (select count(*) from public.link_clicks) = 0,
  'a stranger reads no clicks at all'
);

select pg_temp.denied(
  $$insert into public.page_views (profile_id) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001')$$,
  'a stranger cannot forge a page view'
);

select pg_temp.denied(
  $$insert into public.link_clicks (profile_id) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001')$$,
  'a stranger cannot forge a click'
);

-- The functions are granted to `authenticated` only, so this is refused before
-- a single statement inside them runs.
select pg_temp.denied(
  $$select * from public.analytics_overview(now() - interval '7 days', now())$$,
  'a stranger cannot call the analytics functions at all'
);

select pg_temp.denied(
  $$select * from public.analytics_top_links(now() - interval '7 days', now(), 10)$$,
  'nor top links'
);

select pg_temp.denied(
  $$select * from public.analytics_recent(10)$$,
  'nor recent activity'
);

reset role;

-- ── What a row is allowed to contain ──────────────────────────────────────

select pg_temp.ok(
  not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name in ('page_views', 'link_clicks')
       and column_name in ('user_agent', 'referrer', 'ip', 'ip_address')
  ),
  'no analytics table holds a user agent, a referrer URL or an address'
);

select pg_temp.denied(
  $$insert into public.page_views (profile_id, source) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001', 'https://evil.example/path?token=x')$$,
  'a source that is a URL rather than an identifier is refused'
);

select pg_temp.denied(
  $$insert into public.page_views (profile_id, visitor_hash) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001', '203.0.113.7')$$,
  'a visitor hash that is not a hash is refused'
);

select pg_temp.denied(
  $$insert into public.page_views (profile_id, device) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001', 'smart-fridge')$$,
  'a device outside the four categories is refused'
);

do $$ begin raise notice ''; raise notice 'All analytics assertions passed.'; end $$;
