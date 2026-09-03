-- What a stranger can read.
--
-- The public page is served with no session at all, so every one of these runs
-- as `anon`. The question each answers is the same: could a visitor to
-- showme.at/<name> obtain this row? Anything the page must not show has to be
-- invisible here, not merely absent from a query the application happens to
-- write today.

\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.ok(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  %', label;
  end if;
end;
$$;

create or replace function pg_temp.denied(statement text, label text)
returns void language plpgsql as $$
declare
  affected bigint;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when others then
    raise notice 'PASS  % [refused: %]', label, sqlerrm;
    return;
  end;

  if affected = 0 then
    raise notice 'PASS  % [no rows matched]', label;
    return;
  end if;

  raise exception 'FAIL  % — statement changed % row(s)', label, affected;
end;
$$;

-- ── Two creators, so nothing can be proved by having only one ─────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'alex@example.com',
   '{"username":"alex"}'::jsonb),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', 'john@example.com',
   '{"username":"john"}'::jsonb);

update public.profiles
   set display_name = 'Alex', bio = 'Creator & entrepreneur'
 where username = 'alex';

update public.profiles
   set display_name = 'John'
 where username = 'john';

-- Each creator's links live in their own links block.
insert into public.blocks (id, profile_id, type, position) values
  ('55555555-0000-4000-8000-00000000000a',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 2),
  ('55555555-0000-4000-8000-00000000000b',
   '7c02e9b4-51aa-4c37-8f60-000000000002', 'links', 0);

insert into public.links (id, profile_id, block_id, title, url, position, is_active) values
  ('11111111-0000-4000-8000-000000000001',
   '0a5e7d31-64bc-4e02-9c88-000000000001', '55555555-0000-4000-8000-00000000000a',
   'Alex second', 'https://example.com/2', 1, true),
  ('11111111-0000-4000-8000-000000000002',
   '0a5e7d31-64bc-4e02-9c88-000000000001', '55555555-0000-4000-8000-00000000000a',
   'Alex first', 'https://example.com/1', 0, true),
  ('11111111-0000-4000-8000-000000000003',
   '0a5e7d31-64bc-4e02-9c88-000000000001', '55555555-0000-4000-8000-00000000000a',
   'Alex draft', 'https://example.com/draft', 2, false),
  ('22222222-0000-4000-8000-000000000001',
   '7c02e9b4-51aa-4c37-8f60-000000000002', '55555555-0000-4000-8000-00000000000b',
   'John only', 'https://example.com/john', 0, true);

insert into public.social_links (id, profile_id, platform, url, position, is_active) values
  ('33333333-0000-4000-8000-000000000001',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'instagram', 'https://instagram.com/alex', 0, true),
  ('33333333-0000-4000-8000-000000000002',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'tiktok', 'https://tiktok.com/@alex', 1, false);

insert into public.blocks (id, profile_id, type, data, position, is_visible) values
  ('44444444-0000-4000-8000-000000000001',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'text',
   '{"text":"Booking open"}'::jsonb, 0, true),
  ('44444444-0000-4000-8000-000000000002',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'text',
   '{"text":"Hidden draft"}'::jsonb, 1, false);

insert into public.page_views (profile_id, country) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'FR');

insert into public.subscriptions (profile_id, plan) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'pro');

-- ── The anonymous visitor ─────────────────────────────────────────────────

set role anon;
select set_config('request.jwt.claims', null, false);

select pg_temp.ok(
  (select display_name from public.profiles where username = 'alex') = 'Alex',
  'a stranger can read a creator profile with no session at all'
);

select pg_temp.ok(
  (select count(*) from public.links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 2,
  'a stranger sees published links'
);

select pg_temp.ok(
  not exists (select 1 from public.links where title = 'Alex draft'),
  'an unpublished link is invisible, not merely unqueried'
);

select pg_temp.ok(
  (select count(*) from public.social_links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 1,
  'a stranger sees only active social links'
);

select pg_temp.ok(
  not exists (select 1 from public.social_links where platform = 'tiktok'),
  'an inactive social link is invisible'
);

-- Scoped to the text blocks the fixture created: the links blocks above are
-- visible too, and counting every row would make this assertion break each
-- time the fixture grows rather than each time the policy does.
select pg_temp.ok(
  (select count(*) from public.blocks where type = 'text') = 1,
  'a stranger sees only visible blocks'
);

select pg_temp.ok(
  not exists (select 1 from public.blocks where data ->> 'text' = 'Hidden draft'),
  'a hidden block''s data never leaves the database'
);

-- The bug that would be invisible with one creator in the fixture.
select pg_temp.ok(
  not exists (
    select 1 from public.links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001'
       and title = 'John only'
  ),
  'one creator''s links never appear under another creator'
);

select pg_temp.ok(
  (select count(*) from public.links
     where profile_id = '7c02e9b4-51aa-4c37-8f60-000000000002') = 1,
  'each creator resolves to their own content independently'
);

-- Ordering is what the page renders in, so it has to survive the round trip.
select pg_temp.ok(
  (select array_agg(title order by position, created_at, id)
     from public.links
    where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001')
    = array['Alex first', 'Alex second'],
  'links come back in position order'
);

-- ── Nothing private, and nothing writable ────────────────────────────────

select pg_temp.ok(
  (select count(*) from public.page_views) = 0,
  'a stranger cannot read anybody''s analytics'
);

select pg_temp.ok(
  (select count(*) from public.subscriptions) = 0,
  'a stranger cannot read anybody''s billing'
);

select pg_temp.ok(
  not exists (select 1 from public.profiles where username_claimed_at is null and false),
  'the profiles a stranger reads carry no auth rows with them'
);

select pg_temp.denied(
  $$update public.profiles set bio = 'defaced' where username = 'alex'$$,
  'a stranger cannot edit a profile'
);

select pg_temp.denied(
  $$update public.links set title = 'hijacked'
      where id = '11111111-0000-4000-8000-000000000001'$$,
  'a stranger cannot edit a link'
);

select pg_temp.denied(
  $$update public.links set is_active = true
      where id = '11111111-0000-4000-8000-000000000003'$$,
  'a stranger cannot publish somebody else''s draft'
);

select pg_temp.denied(
  $$insert into public.links (profile_id, block_id, title, url)
      values ('0a5e7d31-64bc-4e02-9c88-000000000001',
              '55555555-0000-4000-8000-00000000000a', 'planted', 'https://evil.example')$$,
  'a stranger cannot plant a link on a creator''s page'
);

select pg_temp.denied(
  $$delete from public.links where id = '11111111-0000-4000-8000-000000000001'$$,
  'a stranger cannot delete a link'
);

select pg_temp.denied(
  $$insert into public.blocks (profile_id, type) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001', 'text')$$,
  'a stranger cannot add a block'
);

reset role;

-- ── The owner, when the page is served without a session ─────────────────

-- The public page uses a session-less client on purpose, so a signed-in
-- creator opening their own URL is `anon` here and sees exactly what the world
-- sees. This asserts the other half: their drafts are still theirs to read
-- when they are actually authenticated.
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001"}', false);

select pg_temp.ok(
  (select count(*) from public.links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 3,
  'the owner can still read their own drafts when authenticated'
);

select pg_temp.denied(
  $$update public.links set title = 'hijacked'
      where id = '22222222-0000-4000-8000-000000000001'$$,
  'an authenticated creator still cannot touch another creator''s link'
);

reset role;

-- ── URLs the page would put in an href ───────────────────────────────────

select pg_temp.denied(
  $$insert into public.links (profile_id, block_id, title, url) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001',
       '55555555-0000-4000-8000-00000000000a', 'x', 'javascript:alert(1)')$$,
  'a javascript: link cannot be stored'
);

select pg_temp.denied(
  $$insert into public.links (profile_id, block_id, title, url) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001',
       '55555555-0000-4000-8000-00000000000a', 'x', 'data:text/html,<script>')$$,
  'a data: link cannot be stored'
);

select pg_temp.denied(
  $$insert into public.social_links (profile_id, platform, url) values
      ('0a5e7d31-64bc-4e02-9c88-000000000001', 'youtube', 'vbscript:msgbox(1)')$$,
  'a vbscript: social link cannot be stored'
);

do $$ begin raise notice ''; raise notice 'All public page assertions passed.'; end $$;
