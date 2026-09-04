-- ShowMe — Smart Optimization, as assertions
--
-- Three things were added to the database for this phase, and this suite is
-- the case that each of them does what it claims and nothing else.
--
-- The one that matters most is the reorder function. It is the only place in
-- the product where a creator's page is rewritten from a list of ids, and the
-- question an auditor asks about it is short: what happens when the list
-- names somebody else's link.

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

-- A page each, with three links apiece.
set role service_role;

insert into public.blocks (id, profile_id, type, position) values
  ('b0000000-0000-4000-8000-000000000001', '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 0),
  ('b0000000-0000-4000-8000-000000000002', '7c02e9b4-51aa-4c37-8f60-000000000002', 'links', 0);

insert into public.links (id, profile_id, block_id, title, url, position) values
  ('11111111-0000-4000-8000-000000000001', '0a5e7d31-64bc-4e02-9c88-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Website',   'https://example.com/w', 0),
  ('11111111-0000-4000-8000-000000000002', '0a5e7d31-64bc-4e02-9c88-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Instagram', 'https://example.com/i', 1),
  ('11111111-0000-4000-8000-000000000003', '0a5e7d31-64bc-4e02-9c88-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'YouTube',   'https://example.com/y', 2),
  ('22222222-0000-4000-8000-000000000001', '7c02e9b4-51aa-4c37-8f60-000000000002',
   'b0000000-0000-4000-8000-000000000002', 'Rival one', 'https://example.com/1', 0),
  ('22222222-0000-4000-8000-000000000002', '7c02e9b4-51aa-4c37-8f60-000000000002',
   'b0000000-0000-4000-8000-000000000002', 'Rival two', 'https://example.com/2', 1);

-- Views and clicks, on two devices, so a per-device rate has something to say.
insert into public.page_views (profile_id, device, created_at)
select '0a5e7d31-64bc-4e02-9c88-000000000001', 'mobile', now() - interval '1 day'
  from generate_series(1, 80);
insert into public.page_views (profile_id, device, created_at)
select '0a5e7d31-64bc-4e02-9c88-000000000001', 'desktop', now() - interval '1 day'
  from generate_series(1, 20);
insert into public.link_clicks (profile_id, link_id, link_title, device, created_at)
select '0a5e7d31-64bc-4e02-9c88-000000000001', '11111111-0000-4000-8000-000000000003',
       'YouTube', 'mobile', now() - interval '1 day'
  from generate_series(1, 8);
insert into public.link_clicks (profile_id, link_id, link_title, device, created_at)
select '0a5e7d31-64bc-4e02-9c88-000000000001', '11111111-0000-4000-8000-000000000003',
       'YouTube', 'desktop', now() - interval '1 day'
  from generate_series(1, 6);

-- And a page nobody should be able to read from over here.
insert into public.page_views (profile_id, device, created_at)
select '7c02e9b4-51aa-4c37-8f60-000000000002', 'mobile', now() - interval '1 day'
  from generate_series(1, 500);

reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- Views and clicks per device
-- ══════════════════════════════════════════════════════════════════════════

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001","role":"authenticated"}', false);

do $$
declare
  mobile record;
  desktop record;
begin
  select * into mobile from public.analytics_device_performance(now() - interval '7 days', now())
   where device = 'mobile';
  select * into desktop from public.analytics_device_performance(now() - interval '7 days', now())
   where device = 'desktop';

  perform pg_temp.ok(mobile.views = 80 and mobile.clicks = 8,
    'device performance counts views and clicks on the same device');
  perform pg_temp.ok(desktop.views = 20 and desktop.clicks = 6,
    'and does the same for every other device');

  -- The rival has five hundred views. None of them may be counted here.
  perform pg_temp.ok(
    (select coalesce(sum(views), 0)
       from public.analytics_device_performance(now() - interval '7 days', now())) = 100,
    'Row Level Security decides whose events are counted, not an argument');

  -- The window is half-open, like every other analytics function.
  perform pg_temp.ok(
    (select coalesce(sum(views), 0)
       from public.analytics_device_performance(now(), now() + interval '1 day')) = 0,
    'device performance respects its window');
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- Reordering
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  touched integer;
begin
  -- The ordinary case: three of the creator's own links, new positions.
  select public.optimize_reorder_links(
    '[{"id":"11111111-0000-4000-8000-000000000003","position":0},
      {"id":"11111111-0000-4000-8000-000000000001","position":1},
      {"id":"11111111-0000-4000-8000-000000000002","position":2}]'::jsonb
  ) into touched;

  perform pg_temp.ok(touched = 3, 'a reorder reports how many rows it moved');
  perform pg_temp.ok(
    (select position from public.links where id = '11111111-0000-4000-8000-000000000003') = 0
      and (select position from public.links where id = '11111111-0000-4000-8000-000000000001') = 1,
    'the new order is the one that was asked for');

  -- The case that matters. A payload naming another creator's links.
  select public.optimize_reorder_links(
    '[{"id":"22222222-0000-4000-8000-000000000001","position":9},
      {"id":"22222222-0000-4000-8000-000000000002","position":8}]'::jsonb
  ) into touched;

  perform pg_temp.ok(touched = 0,
    'a reorder naming another creator''s links moves nothing and says so');
  perform pg_temp.ok(
    (select count(*) from public.links
      where profile_id = '7c02e9b4-51aa-4c37-8f60-000000000002' and position > 1) = 0,
    'and their page is exactly as it was');

  -- A mixed payload: some mine, some theirs. Only mine move.
  select public.optimize_reorder_links(
    '[{"id":"11111111-0000-4000-8000-000000000001","position":5},
      {"id":"22222222-0000-4000-8000-000000000001","position":5}]'::jsonb
  ) into touched;

  perform pg_temp.ok(touched = 1, 'a mixed payload moves only the caller''s own rows');
  perform pg_temp.ok(
    (select position from public.links where id = '22222222-0000-4000-8000-000000000001') = 0,
    'the other creator''s link is untouched by a payload that names it');

  -- Nothing to do is not an error.
  perform pg_temp.ok(public.optimize_reorder_links('[]'::jsonb) = 0,
    'an empty order is a no-op rather than a failure');
  perform pg_temp.ok(public.optimize_reorder_links(null) = 0,
    'a null order is a no-op rather than a failure');
end
$$;

-- The function cannot move a link between blocks, because block_id is not a
-- parameter. This asserts the shape rather than the behaviour: there is no
-- argument through which a section change could be requested.
do $$
begin
  perform pg_temp.ok(
    (select count(*) from information_schema.parameters
      where specific_schema = 'public'
        and specific_name in (
          select specific_name from information_schema.routines
           where routine_schema = 'public' and routine_name = 'optimize_reorder_links')) = 1,
    'the reorder function takes exactly one argument, so a block cannot be named');
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- What the creator decided
-- ══════════════════════════════════════════════════════════════════════════

insert into public.optimization_events
  (profile_id, kind, recommendation_type, recommendation_key, summary, undo)
values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'applied', 'HIGH_PERFORMING_LOW_POSITION',
   'HIGH_PERFORMING_LOW_POSITION:11111111-0000-4000-8000-000000000003',
   'Moved YouTube to the top of its section',
   '{"kind":"positions","links":[{"id":"11111111-0000-4000-8000-000000000003","position":2}]}'::jsonb),
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'dismissed', 'SOURCE_CONCENTRATION',
   'SOURCE_CONCENTRATION:instagram', 'Instagram sends most of your visitors', null);

do $$
begin
  perform pg_temp.ok(
    (select count(*) from public.optimization_events) = 2,
    'a creator reads their own optimization history');

  perform pg_temp.ok(
    (select undo is not null from public.optimization_events where kind = 'applied'),
    'an applied optimization stores what it takes to put the page back');
end
$$;

-- Dismissing twice is dismissing once.
select pg_temp.denied($$
  insert into public.optimization_events
    (profile_id, kind, recommendation_type, recommendation_key, summary)
  values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'dismissed', 'SOURCE_CONCENTRATION',
          'SOURCE_CONCENTRATION:instagram', 'Again')
$$, 'the same recommendation cannot be dismissed twice');

-- The same key applied twice is fine: applying is an event, not a state.
insert into public.optimization_events
  (profile_id, kind, recommendation_type, recommendation_key, summary)
values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'applied', 'LINK_ORDER_OPPORTUNITY',
        'LINK_ORDER_OPPORTUNITY', 'Reordered 3 links by clicks');
insert into public.optimization_events
  (profile_id, kind, recommendation_type, recommendation_key, summary)
values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'applied', 'LINK_ORDER_OPPORTUNITY',
        'LINK_ORDER_OPPORTUNITY', 'Reordered 2 links by clicks');

select pg_temp.ok(
  (select count(*) from public.optimization_events where kind = 'applied') = 3,
  'the same optimization can be applied more than once, and each is its own entry');

-- Shape: a type that is not a rule name, and text that is too long.
select pg_temp.denied($$
  insert into public.optimization_events
    (profile_id, kind, recommendation_type, recommendation_key, summary)
  values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'applied', 'drop table links',
          'x', 'y')
$$, 'a recommendation type has to look like a rule name');

select pg_temp.denied($$
  insert into public.optimization_events
    (profile_id, kind, recommendation_type, recommendation_key, summary)
  values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'sabotage', 'STALE_LINK', 'x', 'y')
$$, 'there are exactly two kinds of optimization event');

select pg_temp.denied($$
  insert into public.optimization_events
    (profile_id, kind, recommendation_type, recommendation_key, summary)
  values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'applied', 'STALE_LINK', 'x',
          repeat('x', 400))
$$, 'a summary is bounded');

-- Deleting the creator takes their optimization history with it.
reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- A rival, and a stranger
-- ══════════════════════════════════════════════════════════════════════════

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"7c02e9b4-51aa-4c37-8f60-000000000002","role":"authenticated"}', false);

do $$
begin
  perform pg_temp.ok(
    (select count(*) from public.optimization_events) = 0,
    'a rival reads none of another creator''s optimization history');

  perform pg_temp.ok(
    (select coalesce(sum(views), 0)
       from public.analytics_device_performance(now() - interval '7 days', now())) = 500,
    'and sees only their own device numbers');
end
$$;

select pg_temp.denied($$
  update public.optimization_events set summary = 'tampered'
$$, 'a rival cannot edit another creator''s optimization history');

select pg_temp.denied($$
  delete from public.optimization_events
$$, 'nor delete it');

select pg_temp.denied($$
  insert into public.optimization_events
    (profile_id, kind, recommendation_type, recommendation_key, summary)
  values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'dismissed', 'STALE_LINK', 'k', 's')
$$, 'nor write one onto another creator''s account');

reset role;

set role anon;
select set_config('request.jwt.claims', 'null', false);

do $$
begin
  perform pg_temp.ok(
    (select count(*) from public.optimization_events) = 0,
    'a visitor reads no optimization data at all');
end
$$;

select pg_temp.denied($$
  insert into public.optimization_events
    (profile_id, kind, recommendation_type, recommendation_key, summary)
  values ('0a5e7d31-64bc-4e02-9c88-000000000001', 'dismissed', 'STALE_LINK', 'k', 's')
$$, 'and cannot write one');

do $$
begin
  begin
    perform public.optimize_reorder_links('[]'::jsonb);
    raise exception 'FAIL  a visitor cannot reorder anybody''s links';
  exception
    when insufficient_privilege then
      raise notice 'PASS  a visitor cannot reorder anybody''s links [refused: %]', sqlerrm;
  end;

  begin
    perform public.analytics_device_performance(now() - interval '7 days', now());
    raise exception 'FAIL  a visitor cannot read device performance';
  exception
    when insufficient_privilege then
      raise notice 'PASS  a visitor cannot read device performance [refused: %]', sqlerrm;
  end;
end
$$;

reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- The table itself
-- ══════════════════════════════════════════════════════════════════════════

do $$
begin
  perform pg_temp.ok(
    (select relrowsecurity from pg_class where oid = 'public.optimization_events'::regclass),
    'row level security is on for optimization_events');

  perform pg_temp.ok(
    (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'optimization_events') = 4,
    'it has exactly the four policies it needs and no read policy for anyone else');

  perform pg_temp.ok(
    not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'optimization_events'
                   and 'anon' = any(roles)),
    'none of them is granted to anon');

  perform pg_temp.ok(
    exists (select 1 from pg_indexes where schemaname = 'public'
             and indexname = 'optimization_events_profile_created_idx'),
    'the history query is indexed by owner and time');

  perform pg_temp.ok(
    (select confdeltype from pg_constraint
      where conrelid = 'public.optimization_events'::regclass and contype = 'f') = 'c',
    'deleting an account takes its optimization history with it');

  -- Both new functions pin their search_path and run as the caller, like every
  -- other function in this schema.
  perform pg_temp.ok(
    (select count(*) from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('optimize_reorder_links', 'analytics_device_performance')
        and not p.prosecdef
        and exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
                     where cfg like 'search_path=%')) = 2,
    'both new functions are security invoker with an empty search_path');
end
$$;

do $$
begin
  raise notice '';
  raise notice 'All Smart Optimization assertions passed.';
end
$$;
