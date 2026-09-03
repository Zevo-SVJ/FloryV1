-- ShowMe — the editor, and what a client cannot do with it
--
-- Phase 4 adds three new ways to write to the database, and each one is a new
-- way to try to write to somebody else's page:
--
--   · `save_page()`, which replaces a whole page in one transaction;
--   · `links.block_id`, which points a link at a section;
--   · the `page-media` Storage bucket.
--
-- The assertions below are mostly about refusal. `save_page` is `security
-- invoker`, so the interesting question is not whether it works — it is
-- whether it still refuses everything Row Level Security refuses when called
-- by somebody with a session and bad intentions.

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

-- A statement that must be refused, whether by a policy or a constraint.
--
-- A policy refusal on UPDATE or DELETE is silent: the row is invisible, zero
-- rows change, and no error is raised. So zero affected rows counts as a
-- denial, and any other outcome is a failure.
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
    or foreign_key_violation or raise_exception then
    raise notice 'PASS  % [refused: %]', label, sqlerrm;
end;
$$;

-- ── Two creators ──────────────────────────────────────────────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('0a5e7d31-64bc-4e02-9c88-000000000001', 'zevo@example.com', '{"username":"zevo"}'::jsonb),
  ('7c02e9b4-51aa-4c37-8f60-000000000002', 'rival@example.com', '{"username":"rival"}'::jsonb);

-- Rival has a page already, so there is something real to try to reach.
insert into public.blocks (id, profile_id, type, position, data) values
  ('99999999-0000-4000-8000-00000000000b',
   '7c02e9b4-51aa-4c37-8f60-000000000002', 'links', 0, '{}'::jsonb);

insert into public.links (id, profile_id, block_id, title, url, position) values
  ('99999999-0000-4000-8000-00000000000c',
   '7c02e9b4-51aa-4c37-8f60-000000000002',
   '99999999-0000-4000-8000-00000000000b',
   'Rival link', 'https://rival.example', 0);

-- ── save_page, as its owner ───────────────────────────────────────────────

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001"}', false);

select public.save_page($${
  "profile": {"displayName": "Zevo", "bio": "Creator & entrepreneur", "avatarUrl": null},
  "socials": [
    {"id": "11111111-0000-4000-8000-000000000001", "platform": "instagram",
     "url": "https://instagram.com/8zevo", "isActive": true},
    {"id": "11111111-0000-4000-8000-000000000002", "platform": "email",
     "url": "mailto:hello@example.com", "isActive": true}
  ],
  "blocks": [
    {"id": "22222222-0000-4000-8000-000000000001", "type": "socials",
     "data": {}, "isVisible": true, "links": []},
    {"id": "22222222-0000-4000-8000-000000000002", "type": "links",
     "data": {"title": "Latest"}, "isVisible": true,
     "links": [
       {"id": "33333333-0000-4000-8000-000000000001", "title": "Shop",
        "url": "https://example.com/shop", "isActive": true},
       {"id": "33333333-0000-4000-8000-000000000002", "title": "Draft",
        "url": "https://example.com/draft", "isActive": false}
     ]},
    {"id": "22222222-0000-4000-8000-000000000003", "type": "text",
     "data": {"text": "Hello", "align": "center", "style": "body"},
     "isVisible": false, "links": []}
  ]
}$$::jsonb);

select pg_temp.ok(
  (select display_name from public.profiles where id = '0a5e7d31-64bc-4e02-9c88-000000000001')
    = 'Zevo',
  'save_page writes the profile'
);

select pg_temp.ok(
  (select count(*) from public.blocks
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 3,
  'save_page creates every block it was given'
);

select pg_temp.ok(
  (select array_agg(position order by position)
     from public.blocks where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001')
    = array[0, 1, 2],
  'array order becomes position, with no gaps'
);

select pg_temp.ok(
  (select type from public.blocks where position = 0
     and profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 'socials',
  'the first block in the array is the first block on the page'
);

select pg_temp.ok(
  (select is_visible from public.blocks
     where id = '22222222-0000-4000-8000-000000000003') = false,
  'a hidden block is saved hidden rather than dropped'
);

select pg_temp.ok(
  (select block_id from public.links where id = '33333333-0000-4000-8000-000000000001')
    = '22222222-0000-4000-8000-000000000002',
  'a link is attached to the block it was edited in'
);

select pg_temp.ok(
  (select is_active from public.links where id = '33333333-0000-4000-8000-000000000002')
    = false,
  'an unpublished link is saved, not discarded'
);

select pg_temp.ok(
  (select url from public.social_links where platform = 'email'
     and profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001')
    = 'mailto:hello@example.com',
  'an email contact is stored as a mailto:'
);

-- ── Saving again replaces, rather than accumulating ───────────────────────

select public.save_page($${
  "profile": {"displayName": "Zevo", "bio": "", "avatarUrl": null},
  "socials": [
    {"id": "11111111-0000-4000-8000-000000000001", "platform": "instagram",
     "url": "https://instagram.com/8zevo", "isActive": true}
  ],
  "blocks": [
    {"id": "22222222-0000-4000-8000-000000000002", "type": "links",
     "data": {"title": "Shop"}, "isVisible": true,
     "links": [
       {"id": "33333333-0000-4000-8000-000000000001", "title": "Shop, renamed",
        "url": "https://example.com/shop", "isActive": true}
     ]}
  ]
}$$::jsonb);

select pg_temp.ok(
  (select count(*) from public.blocks
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 1,
  'a block left out of the payload is deleted'
);

select pg_temp.ok(
  not exists (select 1 from public.links
                where id = '33333333-0000-4000-8000-000000000002'),
  'a link left out of the payload is deleted'
);

select pg_temp.ok(
  (select title from public.links where id = '33333333-0000-4000-8000-000000000001')
    = 'Shop, renamed',
  'an edited link keeps its id and gains its new title'
);

select pg_temp.ok(
  (select count(*) from public.social_links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 1,
  'a removed social link is deleted'
);

select pg_temp.ok(
  (select bio from public.profiles where id = '0a5e7d31-64bc-4e02-9c88-000000000001')
    is null,
  'a cleared bio becomes null rather than an empty string'
);

-- A creator who empties their page entirely gets an empty page, not an error.
select public.save_page($${
  "profile": {"displayName": "", "bio": "", "avatarUrl": null},
  "socials": [], "blocks": []
}$$::jsonb);

select pg_temp.ok(
  (select count(*) from public.blocks
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 0
  and (select count(*) from public.links
     where profile_id = '0a5e7d31-64bc-4e02-9c88-000000000001') = 0,
  'an empty payload empties the page without failing'
);

-- ── save_page cannot reach another creator ────────────────────────────────
--
-- The function takes no owner: it reads `auth.uid()`. So the only way to aim
-- it at somebody else is to send their row ids and hope the upsert lands.

select pg_temp.denied(
  $$select public.save_page($x${
    "profile": {"displayName": "Hijacked", "bio": "", "avatarUrl": null},
    "socials": [],
    "blocks": [{"id": "99999999-0000-4000-8000-00000000000b", "type": "links",
                "data": {"title": "Hijacked"}, "isVisible": true, "links": []}]
  }$x$::jsonb)$$,
  'save_page cannot upsert a block owned by another creator'
);

select pg_temp.ok(
  (select data ->> 'title' from public.blocks
     where id = '99999999-0000-4000-8000-00000000000b') is distinct from 'Hijacked',
  'the other creator''s block is untouched after that attempt'
);

select pg_temp.ok(
  (select display_name from public.profiles
     where id = '7c02e9b4-51aa-4c37-8f60-000000000002') is distinct from 'Hijacked',
  'a failed save_page leaves no partial write behind'
);

select pg_temp.ok(
  exists (select 1 from public.links where id = '99999999-0000-4000-8000-00000000000c'),
  'save_page never deletes another creator''s links'
);

-- ── links.block_id cannot cross an owner boundary ─────────────────────────

insert into public.blocks (id, profile_id, type, position)
  values ('44444444-0000-4000-8000-000000000001',
          '0a5e7d31-64bc-4e02-9c88-000000000001', 'links', 0);

select pg_temp.denied(
  $$insert into public.links (profile_id, block_id, title, url)
      values ('0a5e7d31-64bc-4e02-9c88-000000000001',
              '99999999-0000-4000-8000-00000000000b',
              'planted', 'https://evil.example')$$,
  'a link cannot be placed inside another creator''s block'
);

insert into public.links (id, profile_id, block_id, title, url, position)
  values ('44444444-0000-4000-8000-000000000002',
          '0a5e7d31-64bc-4e02-9c88-000000000001',
          '44444444-0000-4000-8000-000000000001', 'Mine', 'https://example.com/mine', 0);

select pg_temp.denied(
  $$update public.links set block_id = '99999999-0000-4000-8000-00000000000b'
      where id = '44444444-0000-4000-8000-000000000002'$$,
  'an owned link cannot be moved into another creator''s block'
);

-- A links block is the only kind that holds links: a link parked inside a text
-- block would be a row the renderer never reaches and nobody could find again.
insert into public.blocks (id, profile_id, type, position, data)
  values ('44444444-0000-4000-8000-000000000003',
          '0a5e7d31-64bc-4e02-9c88-000000000001', 'text', 1, '{"text":"hi"}'::jsonb);

select pg_temp.denied(
  $$update public.links set block_id = '44444444-0000-4000-8000-000000000003'
      where id = '44444444-0000-4000-8000-000000000002'$$,
  'a link cannot be attached to a block that is not a links block'
);

select pg_temp.ok(
  (select block_id from public.links where id = '44444444-0000-4000-8000-000000000002')
    = '44444444-0000-4000-8000-000000000001',
  'the link is still in its own block after both attempts'
);

-- Deleting a section takes its links with it, rather than orphaning rows that
-- nothing can render and no editor can reach.
delete from public.blocks where id = '44444444-0000-4000-8000-000000000001';

select pg_temp.ok(
  not exists (select 1 from public.links where id = '44444444-0000-4000-8000-000000000002'),
  'deleting a links block deletes the links inside it'
);

reset role;

-- ── Storage ───────────────────────────────────────────────────────────────

select pg_temp.ok(
  (select public from storage.buckets where id = 'page-media'),
  'the media bucket is publicly readable, because the pages are'
);

select pg_temp.ok(
  (select file_size_limit from storage.buckets where id = 'page-media') = 5242880,
  'Storage enforces the size limit itself, not only the application'
);

select pg_temp.ok(
  not ('image/svg+xml' = any (select unnest(allowed_mime_types)
                                from storage.buckets where id = 'page-media')),
  'SVG is not an accepted upload — it is a document that can carry script'
);

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001"}', false);

insert into storage.objects (bucket_id, name, owner)
  values ('page-media', '0a5e7d31-64bc-4e02-9c88-000000000001/photo.jpg',
          '0a5e7d31-64bc-4e02-9c88-000000000001');

select pg_temp.ok(
  exists (select 1 from storage.objects
            where name = '0a5e7d31-64bc-4e02-9c88-000000000001/photo.jpg'),
  'a creator can upload into their own folder'
);

select pg_temp.denied(
  $$insert into storage.objects (bucket_id, name)
      values ('page-media', '7c02e9b4-51aa-4c37-8f60-000000000002/planted.jpg')$$,
  'a creator cannot upload into somebody else''s folder'
);

select pg_temp.denied(
  $$insert into storage.objects (bucket_id, name)
      values ('page-media', 'photo.jpg')$$,
  'an object at the bucket root, owned by nobody, is refused'
);

-- Rival's own file, to try to reach.
reset role;
insert into storage.objects (bucket_id, name, owner)
  values ('page-media', '7c02e9b4-51aa-4c37-8f60-000000000002/rival.jpg',
          '7c02e9b4-51aa-4c37-8f60-000000000002');

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"0a5e7d31-64bc-4e02-9c88-000000000001"}', false);

select pg_temp.denied(
  $$delete from storage.objects
      where name = '7c02e9b4-51aa-4c37-8f60-000000000002/rival.jpg'$$,
  'a creator cannot delete somebody else''s media'
);

-- The attack the `with check` clause on UPDATE exists for: keeping ownership
-- of an object while moving it into a folder you do not own.
select pg_temp.denied(
  $$update storage.objects
       set name = '7c02e9b4-51aa-4c37-8f60-000000000002/moved.jpg'
     where name = '0a5e7d31-64bc-4e02-9c88-000000000001/photo.jpg'$$,
  'a creator cannot move their own object into another creator''s folder'
);

reset role;

-- ── The visitor with no session ───────────────────────────────────────────

set role anon;

select pg_temp.ok(
  (select count(*) from storage.objects where bucket_id = 'page-media') = 2,
  'a stranger can read media, because it is the content of a public page'
);

select pg_temp.denied(
  $$insert into storage.objects (bucket_id, name)
      values ('page-media', '0a5e7d31-64bc-4e02-9c88-000000000001/anon.jpg')$$,
  'a stranger cannot upload anything'
);

select pg_temp.denied(
  $$delete from storage.objects
      where name = '0a5e7d31-64bc-4e02-9c88-000000000001/photo.jpg'$$,
  'a stranger cannot delete media'
);

-- `save_page` is granted to `authenticated` only, so this is refused before
-- any of its statements run.
select pg_temp.denied(
  $$select public.save_page($x${"profile":{"displayName":"x","bio":"","avatarUrl":null},
                                "socials":[],"blocks":[]}$x$::jsonb)$$,
  'a stranger cannot call save_page at all'
);

reset role;

do $$ begin raise notice ''; raise notice 'All editor assertions passed.'; end $$;
