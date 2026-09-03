-- ShowMe — growth features, and the one that is a security boundary
--
-- Phase 7 adds a schedule to a link, and a schedule is only worth anything if
-- it is enforced where a client cannot reach around it. So most of this suite
-- is one question asked from three directions: before its start, after its
-- end, and switched off, can anybody read a link that is not supposed to be on
-- the page — as a stranger, as the owner's rival, or through the redirect that
-- serves every click.
--
-- The rest checks what the new columns refuse, that `save_page` writes all of
-- them in one transaction and can neither be pointed at somebody else's page
-- nor made to reset a setting it was not told about, and that a link's
-- identity — and therefore its click history — survives every status change.

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

-- ── Two creators, and a link in every state ───────────────────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'zevo@example.com', '{"username":"zevo"}'::jsonb),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', 'rival@example.com', '{"username":"rival"}'::jsonb);

insert into public.blocks (id, profile_id, type, position) values
  ('b0000000-0000-4000-8000-000000000001',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 0),
  ('b0000000-0000-4000-8000-000000000002',
   '7c02e9b4-51aa-4c37-8f60-000000000002', 'links', 0);

/*
 * Five links covering every reason a link is or is not on the page: live, not
 * yet started, already ended, inside a window, and switched off. Every
 * instant is relative to `now()`, so the suite does not rot.
 */
insert into public.links
  (id, profile_id, block_id, title, url, position, is_active, starts_at, ends_at, is_featured)
values
  ('11111111-0000-4000-8000-00000000000a',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Always on', 'https://example.com/always', 0, true, null, null, false),

  ('11111111-0000-4000-8000-00000000000b',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Drop on Friday', 'https://example.com/drop', 1, true,
   now() + interval '2 days', null, true),

  ('11111111-0000-4000-8000-00000000000c',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Last month''s offer', 'https://example.com/offer', 2, true,
   now() - interval '30 days', now() - interval '1 day', false),

  ('11111111-0000-4000-8000-00000000000d',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Running now', 'https://example.com/running', 3, true,
   now() - interval '1 hour', now() + interval '1 hour', false),

  ('11111111-0000-4000-8000-00000000000e',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Switched off', 'https://example.com/off', 4, false, null, null, false);

-- Clicks on the scheduled and expired links, so "does history survive a
-- status change" has something to survive with.
insert into public.link_clicks (profile_id, link_id, link_title, source, device) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001',
   '11111111-0000-4000-8000-00000000000c', 'Last month''s offer', 'instagram', 'mobile'),
  ('0a5e7d31-64bc-4e02-9c88-000000000001',
   '11111111-0000-4000-8000-00000000000c', 'Last month''s offer', 'direct', 'desktop'),
  ('0a5e7d31-64bc-4e02-9c88-000000000001',
   '11111111-0000-4000-8000-00000000000b', 'Drop on Friday', 'direct', 'mobile');

-- ══════════════════════════════════════════════════════════════════════════
-- A stranger: what the world can read
-- ══════════════════════════════════════════════════════════════════════════

set role anon;

do $$
begin
  /*
   * The whole feature, in one assertion. An anonymous reader — which is what
   * the public page's session-less client and the `/go/<id>` redirect both
   * are — sees exactly the two links that are live right now.
   */
  perform pg_temp.ok(
    (select array_agg(title order by position) from public.links)
      = array['Always on', 'Running now'],
    'a stranger sees only the links that are live right now');

  perform pg_temp.ok(
    not exists (select 1 from public.links
                 where id = '11111111-0000-4000-8000-00000000000b'),
    'a link whose start has not arrived is invisible, not merely unrendered');

  perform pg_temp.ok(
    not exists (select 1 from public.links
                 where id = '11111111-0000-4000-8000-00000000000c'),
    'a link whose end has passed is invisible');

  perform pg_temp.ok(
    not exists (select 1 from public.links
                 where id = '11111111-0000-4000-8000-00000000000e'),
    'a link switched off is invisible whatever its dates say');

  /*
   * The point of enforcing this in the policy rather than in the renderer:
   * `/go/<id>` looks a link up by id with this same anonymous client, so a
   * scheduled link cannot be clicked by somebody who guessed its id — and the
   * route needed no code to make that true.
   */
  perform pg_temp.ok(
    not exists (select 1 from public.links
                 where id = '11111111-0000-4000-8000-00000000000b'
                   and is_active),
    'the redirect cannot resolve a link that has not started');

  perform pg_temp.ok(
    (select count(*) from public.links
      where url = 'https://example.com/running') = 1,
    'a link inside its window resolves normally');

  -- Featured is presentation. It must never be the reason a link is readable.
  perform pg_temp.ok(
    not exists (select 1 from public.links where is_featured),
    'featuring a scheduled link does not make it readable');
end
$$;

reset role;

-- ── The two instants the window turns on ──────────────────────────────────

-- The boundary convention, asserted where it is enforced. `src/lib/links/
-- schedule.ts` states the same rule for the editor and the preview and its own
-- tests stand on the same two instants; if these two ever disagree, a creator
-- sees one thing in the editor and the world sees another.
reset role;

insert into public.links
  (id, profile_id, block_id, title, url, position, is_active, starts_at, ends_at)
values
  ('44444444-0000-4000-8000-00000000000a',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Opens exactly now', 'https://example.com/opens', 10, true, now(), null),
  ('44444444-0000-4000-8000-00000000000b',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'Closes exactly now', 'https://example.com/closes', 11, true, null, now());

set role anon;

do $$
begin
  -- Inclusive at the bottom: a link whose start is this instant is live.
  perform pg_temp.ok(
    exists (select 1 from public.links
             where id = '44444444-0000-4000-8000-00000000000a'),
    'a link is live from the instant its window opens');

  /*
   * Exclusive at the top: a link whose end is this instant is already gone.
   * The same convention the analytics windows use, and the reason two links
   * scheduled back to back are never both on the page.
   */
  perform pg_temp.ok(
    not exists (select 1 from public.links
                 where id = '44444444-0000-4000-8000-00000000000b'),
    'and gone at the instant it closes');
end
$$;

reset role;

delete from public.links where id in (
  '44444444-0000-4000-8000-00000000000a',
  '44444444-0000-4000-8000-00000000000b');

-- ══════════════════════════════════════════════════════════════════════════
-- The owner: the editor has to show what the page hides
-- ══════════════════════════════════════════════════════════════════════════

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001"}', false);

do $$
begin
  perform pg_temp.ok(
    (select count(*) from public.links) = 5,
    'the owner reads every link, including the ones nobody else can');

  perform pg_temp.ok(
    (select is_featured from public.links
      where id = '11111111-0000-4000-8000-00000000000b'),
    'the owner can see that a link is featured');

  perform pg_temp.ok(
    (select starts_at is not null and ends_at is null from public.links
      where id = '11111111-0000-4000-8000-00000000000b'),
    'a start with no end is a valid schedule');

  perform pg_temp.ok(
    (select starts_at is null and ends_at is null from public.links
      where id = '11111111-0000-4000-8000-00000000000a'),
    'no schedule at all is the default');
end
$$;

-- ── What the columns refuse ───────────────────────────────────────────────

do $$
begin
  perform pg_temp.denied($stmt$
    update public.links set ends_at = starts_at - interval '1 day'
     where id = '11111111-0000-4000-8000-00000000000b'
  $stmt$, 'a window that ends before it begins is refused');

  perform pg_temp.denied($stmt$
    update public.links set starts_at = now(), ends_at = now()
     where id = '11111111-0000-4000-8000-00000000000a'
  $stmt$, 'a zero-length window is refused, since nobody could ever see it');

  perform pg_temp.denied($stmt$
    update public.links
       set icon_platform = 'instagram',
           icon_url = 'https://example.supabase.co/storage/v1/object/public/page-media/x/y.png'
     where id = '11111111-0000-4000-8000-00000000000a'
  $stmt$, 'a link cannot carry a platform mark and an uploaded icon at once');

  perform pg_temp.denied($stmt$
    update public.links set icon_url = 'http://example.com/insecure.png'
     where id = '11111111-0000-4000-8000-00000000000a'
  $stmt$, 'an icon served over http is refused');

  perform pg_temp.denied($stmt$
    update public.links set icon_platform = 'myspace'
     where id = '11111111-0000-4000-8000-00000000000a'
  $stmt$, 'an icon platform outside the enum is refused');
end
$$;

-- ── A link keeps its identity through every status change ─────────────────

do $$
declare
  clicks_before integer;
begin
  select count(*) into clicks_before from public.link_clicks
   where link_id = '11111111-0000-4000-8000-00000000000c';

  -- Expired → live → hidden → featured, all on the same row.
  update public.links
     set ends_at = now() + interval '1 day'
   where id = '11111111-0000-4000-8000-00000000000c';
  update public.links set is_active = false
   where id = '11111111-0000-4000-8000-00000000000c';
  update public.links set is_featured = true, is_active = true
   where id = '11111111-0000-4000-8000-00000000000c';

  perform pg_temp.ok(
    (select count(*) from public.link_clicks
      where link_id = '11111111-0000-4000-8000-00000000000c') = clicks_before
      and clicks_before = 2,
    'a link that changes status keeps every click it earned');

  perform pg_temp.ok(
    (select count(*) from public.links
      where id = '11111111-0000-4000-8000-00000000000c') = 1,
    'and keeps its id, so no click is orphaned or duplicated');

  -- Put it back, so the assertions below describe the fixture they expect.
  update public.links
     set ends_at = now() - interval '1 day', is_featured = false
   where id = '11111111-0000-4000-8000-00000000000c';
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- save_page writes a link's whole life, in one transaction
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'profile', jsonb_build_object(
      'displayName', 'Zevo', 'bio', 'Creator', 'avatarUrl', null,
      'searchVisible', false),
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'b0000000-0000-4000-8000-000000000001',
        'type', 'links',
        'isVisible', true,
        'data', jsonb_build_object('title', 'Shop', 'layout', 'grid'),
        'links', jsonb_build_array(
          jsonb_build_object(
            'id', '11111111-0000-4000-8000-00000000000a',
            'title', 'Always on', 'url', 'https://example.com/always',
            'isActive', true, 'isFeatured', true,
            'startsAt', null, 'endsAt', null,
            'iconPlatform', 'instagram', 'iconUrl', null),
          jsonb_build_object(
            'id', '11111111-0000-4000-8000-00000000000b',
            'title', 'Drop on Friday', 'url', 'https://example.com/drop',
            'isActive', true, 'isFeatured', false,
            'startsAt', to_char(now() + interval '3 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'endsAt', to_char(now() + interval '5 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'iconPlatform', null, 'iconUrl', null))),
      jsonb_build_object(
        'id', 'b0000000-0000-4000-8000-00000000000f',
        'type', 'contact',
        'isVisible', true,
        'data', jsonb_build_object(
          'title', 'Get in touch',
          'items', jsonb_build_array(
            jsonb_build_object('id', 'c1', 'kind', 'email',
                               'label', '', 'value', 'hi@example.com'))),
        'links', '[]'::jsonb),
      jsonb_build_object(
        'id', 'b0000000-0000-4000-8000-00000000001a',
        'type', 'heading',
        'isVisible', true,
        'data', jsonb_build_object('text', 'My work', 'level', 'section', 'align', 'center'),
        'links', '[]'::jsonb),
      jsonb_build_object(
        'id', 'b0000000-0000-4000-8000-00000000001b',
        'type', 'spacer',
        'isVisible', true,
        'data', jsonb_build_object('size', 'large'),
        'links', '[]'::jsonb)),
    'socials', '[]'::jsonb);

  perform public.save_page(payload);

  perform pg_temp.ok(
    (select is_featured and icon_platform = 'instagram'
       from public.links where id = '11111111-0000-4000-8000-00000000000a'),
    'save_page writes featured and a platform icon');

  perform pg_temp.ok(
    (select starts_at > now() + interval '2 days'
        and ends_at > starts_at
       from public.links where id = '11111111-0000-4000-8000-00000000000b'),
    'save_page writes a schedule as absolute instants');

  perform pg_temp.ok(
    (select data ->> 'layout' from public.blocks
      where id = 'b0000000-0000-4000-8000-000000000001') = 'grid',
    'a links block remembers it is a grid');

  perform pg_temp.ok(
    (select count(*) from public.blocks where type = 'contact') = 1
      and (select count(*) from public.blocks where type = 'heading') = 1
      and (select count(*) from public.blocks where type = 'spacer') = 1,
    'the three new block types are storable');

  perform pg_temp.ok(
    (select data -> 'items' -> 0 ->> 'value' from public.blocks
      where type = 'contact') = 'hi@example.com',
    'a contact block keeps its items as its own data, with no new table');

  perform pg_temp.ok(
    (select not search_visible from public.profiles
      where id = '0a5e7d31-64bc-4e02-9c88-000000000001'),
    'save_page can turn search visibility off');

  -- The links the payload no longer mentions are gone, as always.
  perform pg_temp.ok(
    (select count(*) from public.links) = 2,
    'links left out of the payload are deleted, as they always were');

  /*
   * The clicks of a link this save deleted. `on delete set null` plus the
   * title snapshot is Phase 6's promise, and Phase 7's status changes must not
   * have quietly broken it.
   */
  perform pg_temp.ok(
    (select count(*) from public.link_clicks
      where link_id is null and link_title = 'Last month''s offer') = 2,
    'deleting a scheduled link through save_page still keeps its clicks');
end
$$;

-- ── A payload that never mentions the setting leaves it alone ─────────────

do $$
begin
  perform public.save_page(jsonb_build_object(
    'profile', jsonb_build_object('displayName', 'Zevo', 'bio', 'Creator', 'avatarUrl', null),
    'blocks', '[]'::jsonb,
    'socials', '[]'::jsonb));

  perform pg_temp.ok(
    (select not search_visible from public.profiles
      where id = '0a5e7d31-64bc-4e02-9c88-000000000001'),
    'an older client that never heard of search visibility cannot reset it');
end
$$;

reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- A rival: none of this is a way in
-- ══════════════════════════════════════════════════════════════════════════

-- Zevo's page was emptied by the second `save_page` above, so it is rebuilt
-- here — as the migration role, which is not subject to RLS — before the
-- rival is let anywhere near it. Without this the assertions below would pass
-- against an empty table, which is the most comfortable kind of wrong.
reset role;

insert into public.blocks (id, profile_id, type, position) values
  ('b0000000-0000-4000-8000-000000000021',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 0);

insert into public.links
  (id, profile_id, block_id, title, url, position, is_active, starts_at, is_featured)
values
  ('33333333-0000-4000-8000-00000000000a',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000021',
   'Live link', 'https://example.com/live', 0, true, null, true),
  ('33333333-0000-4000-8000-00000000000b',
   '0a5e7d31-64bc-4e02-9c88-000000000001', 'b0000000-0000-4000-8000-000000000021',
   'Not yet', 'https://example.com/not-yet', 1, true, now() + interval '7 days', false);

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"7c02e9b4-51aa-4c37-8f60-000000000002"}', false);

do $$
begin
  /*
   * A live link is readable by everybody, and that is not a leak — it is the
   * product. A creator page has to render for a stranger, and a signed-in
   * rival is a stranger with an account. What must not happen is the two
   * things below.
   */
  perform pg_temp.ok(
    exists (select 1 from public.links
             where id = '33333333-0000-4000-8000-00000000000a'),
    'a live link is readable by anybody, signed in or not — that is the product');

  perform pg_temp.ok(
    not exists (select 1 from public.links
                 where id = '33333333-0000-4000-8000-00000000000b'),
    'a scheduled link is hidden from a signed-in rival as much as from a stranger');

  perform pg_temp.denied($stmt$
    update public.links set starts_at = null, ends_at = null
     where id = '33333333-0000-4000-8000-00000000000b'
  $stmt$, 'a rival cannot publish somebody else''s scheduled link early');

  perform pg_temp.denied($stmt$
    update public.links set is_featured = false
     where id = '33333333-0000-4000-8000-00000000000a'
  $stmt$, 'a rival cannot un-feature a link they can see');

  perform pg_temp.denied($stmt$
    update public.links set icon_platform = 'discord'
     where id = '33333333-0000-4000-8000-00000000000a'
  $stmt$, 'a rival cannot put an icon on somebody else''s link');

  perform pg_temp.denied($stmt$
    delete from public.links where id = '33333333-0000-4000-8000-00000000000a'
  $stmt$, 'a rival cannot delete a link they can read');

  perform pg_temp.denied($stmt$
    update public.profiles set search_visible = false
     where id = '0a5e7d31-64bc-4e02-9c88-000000000001'
  $stmt$, 'a rival cannot remove somebody else''s page from search');

  /*
   * `save_page` takes no owner, so there is no argument to point at another
   * account — a rival calling it writes their own page. This asserts the
   * consequence rather than the mechanism: the call succeeds and leaves the
   * other creator's page exactly as it was.
   */
  perform public.save_page(jsonb_build_object(
    'profile', jsonb_build_object('displayName', 'Rival', 'bio', '', 'avatarUrl', null,
                                  'searchVisible', false),
    'blocks', '[]'::jsonb,
    'socials', '[]'::jsonb));

  perform pg_temp.ok(
    (select display_name from public.profiles
      where id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 'Zevo',
    'a rival calling save_page rewrites their own page and nobody else''s');
end
$$;

reset role;

do $$
begin
  perform pg_temp.ok(
    (select count(*) from public.links
      where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 2,
    'and deletes none of their links, even though its own payload was empty');

  perform pg_temp.ok(
    (select is_featured from public.links
      where id = '33333333-0000-4000-8000-00000000000a'),
    'the featured link is still featured after all of that');
end
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- Search visibility is not an access control, and the schema says so
-- ══════════════════════════════════════════════════════════════════════════

set role anon;
-- A stranger has no session, so the claims go with the role. `'null'` rather
-- than `''`: the shim's `auth.uid()` casts the setting to jsonb, and an empty
-- string is not JSON.
select set_config('request.jwt.claims', 'null', false);

do $$
begin
  /*
   * The distinction the column's name and comment both insist on. A page kept
   * out of search is still readable by anybody holding the address — it has to
   * be, because that address is in somebody's bio — and a reader who thought
   * otherwise would have built a privacy feature that is not one.
   */
  perform pg_temp.ok(
    exists (select 1 from public.profiles
             where username = 'zevo' and search_visible = false),
    'a page kept out of search is still readable by a stranger');

  perform pg_temp.denied($stmt$
    update public.profiles set search_visible = true where username = 'zevo'
  $stmt$, 'a stranger cannot put a page back into search');
end
$$;

reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- The schema itself
-- ══════════════════════════════════════════════════════════════════════════

do $$
begin
  perform pg_temp.ok(
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'links'
        and column_name in ('starts_at', 'ends_at', 'is_featured',
                            'icon_platform', 'icon_url')) = 5,
    'every new link column exists');

  perform pg_temp.ok(
    (select is_nullable = 'YES' from information_schema.columns
      where table_schema = 'public' and table_name = 'links'
        and column_name = 'starts_at'),
    'a schedule is optional');

  perform pg_temp.ok(
    (select column_default = 'false' from information_schema.columns
      where table_schema = 'public' and table_name = 'links'
        and column_name = 'is_featured'),
    'a new link is not featured');

  perform pg_temp.ok(
    (select column_default = 'true' from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'search_visible'),
    'a new page wants to be found');

  -- The old policy is gone, not merely shadowed by the new one: a permissive
  -- policy left behind would grant everything the new one refuses.
  perform pg_temp.ok(
    not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'links'
                   and policyname = 'active links are readable by anyone'),
    'the policy that ignored the schedule was replaced, not left alongside');

  perform pg_temp.ok(
    exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'links'
               and policyname = 'live links are readable by anyone'
               and qual like '%starts_at%' and qual like '%ends_at%'),
    'the public read policy is the thing that enforces the schedule');

  perform pg_temp.ok(
    (select count(*) from unnest(enum_range(null::public.block_type)) t
      where t::text in ('heading', 'spacer', 'contact')) = 3,
    'the three new block types are in the enum');
end
$$;

do $$
begin
  raise notice '';
  raise notice 'All growth assertions passed.';
end
$$;
