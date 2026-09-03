-- ShowMe — the editor, and the media it uploads
--
-- Phase 4 turns `blocks` from a table nothing writes into the spine of the
-- page. Three things follow from that, and this migration is all three.
--
--   1. A page is an ordered list of blocks. Links and social links stay in
--      their own tables — they are first-class rows that `link_clicks` will
--      reference in Phase 6, and burying them inside a JSONB blob would make
--      per-link analytics a rewrite. So a `links` block *owns* a set of links
--      by id, rather than duplicating them.
--
--   2. Ownership has to survive a client that lies. A links block belonging to
--      one creator must never be able to adopt another creator's link, even
--      though Row Level Security already stops a creator from writing a row
--      they do not own.
--
--   3. Images need somewhere to live. That is a Storage bucket, and its
--      policies are the same shape as every other policy here: the first
--      segment of the object path is the owner's id, and nothing else may be
--      written.

-- ────────────────────────────────────────────────────────────────────────────
-- links belong to a links block
-- ────────────────────────────────────────────────────────────────────────────

-- Nullable for the length of the backfill below, then made NOT NULL. Every
-- link on a page is inside a section; a link with no section has nowhere to
-- render, and allowing that state would mean two rendering paths forever.
alter table public.links
  add column block_id uuid references public.blocks (id) on delete cascade;

comment on column public.links.block_id is
  'The links block this link renders inside. Always the same owner as the link — enforced by links_block_same_owner.';

-- ────────────────────────────────────────────────────────────────────────────
-- A block and its links always share an owner
-- ────────────────────────────────────────────────────────────────────────────

-- RLS already stops a creator from inserting a link owned by somebody else.
-- It does not stop them from pointing a link they *do* own at a block they do
-- not — which would be an attempt to place content on a stranger's page.
--
-- Today that attempt renders nothing, because the public query reaches links
-- through the profile rather than through the block. That is a property of one
-- query, and this is a property of the database.
create or replace function public.enforce_block_same_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid;
  kind public.block_type;
begin
  if new.block_id is null then
    return new;
  end if;

  select b.profile_id, b.type into owner, kind
    from public.blocks b
   where b.id = new.block_id;

  -- No row visible: either the block does not exist, or it belongs to somebody
  -- else and RLS is hiding it. Both are the same refusal from here, and saying
  -- which would answer a question the caller has no right to ask.
  if owner is null or owner <> new.profile_id then
    raise exception 'block_not_owned' using
      errcode = 'check_violation',
      detail = 'A link can only belong to a block on the same page.';
  end if;

  if kind <> 'links' then
    raise exception 'block_wrong_type' using
      errcode = 'check_violation',
      detail = 'Links can only belong to a links block.';
  end if;

  return new;
end;
$$;

create trigger links_block_same_owner
  before insert or update of block_id, profile_id on public.links
  for each row execute function public.enforce_block_same_owner();

-- ────────────────────────────────────────────────────────────────────────────
-- Backfill: every existing link gets a section, every existing page a shape
-- ────────────────────────────────────────────────────────────────────────────

-- Phase 3 rendered socials and then links, in that order, above whatever
-- blocks existed. Reproducing that arrangement as real blocks means a page
-- that was live before this migration renders identically after it — the
-- difference is that its owner can now move the two sections.
--
-- `security definer` is not needed: this runs as the migration role, which is
-- not subject to RLS.
do $$
declare
  p record;
  socials_block uuid;
  links_block uuid;
begin
  for p in
    select pr.id,
           exists (select 1 from public.social_links s where s.profile_id = pr.id) as has_socials,
           exists (select 1 from public.links l where l.profile_id = pr.id) as has_links
      from public.profiles pr
     where exists (select 1 from public.social_links s where s.profile_id = pr.id)
        or exists (select 1 from public.links l where l.profile_id = pr.id)
  loop
    -- Existing blocks keep their order by being pushed down below the two
    -- sections this creates, which is where they rendered before.
    update public.blocks set position = position + 2 where profile_id = p.id;

    if p.has_socials then
      insert into public.blocks (profile_id, type, position, data)
      values (p.id, 'socials', 0, '{}'::jsonb)
      returning id into socials_block;
    end if;

    if p.has_links then
      insert into public.blocks (profile_id, type, position, data)
      values (p.id, 'links', 1, '{}'::jsonb)
      returning id into links_block;

      update public.links set block_id = links_block
       where profile_id = p.id and block_id is null;
    end if;
  end loop;
end
$$;

alter table public.links alter column block_id set not null;

-- The editor reads a block's links in order; the public page reads a whole
-- page's links in one embedded select. This index serves the first, and the
-- existing (profile_id, position, created_at) index still serves the second.
create index links_block_position_idx
  on public.links (block_id, position, created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- Uploaded media
-- ────────────────────────────────────────────────────────────────────────────

-- A public bucket, deliberately.
--
-- These images are the content of a public page: they are fetched by strangers,
-- cached by the CDN, and embedded in HTML that Next.js caches for a minute.
-- Signed URLs would expire inside that window and leave a cached page pointing
-- at dead images, so the read side is public and the *write* side is what is
-- locked down — which is the same trade the `profiles` table already makes.
--
-- Nothing private is ever put here. The path carries no email, no token, and
-- no filename the uploader chose.
--
-- `file_size_limit` and `allowed_mime_types` are enforced by Storage itself, so
-- they hold even for a request that never passes through the application. The
-- upload action applies the same two rules before it gets this far, and also
-- checks the file's leading bytes — a MIME type in a multipart header is a
-- claim made by the client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'page-media',
  'page-media',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are `<profile_id>/<random>.<ext>`, so ownership is the first
-- path segment and every policy below is one comparison.
--
-- `storage.foldername(name)` returns the path segments as a text array;
-- `[1]` is the first. Written out as `split_part` would be equivalent, but
-- this is the form Supabase's own documentation uses and the one an operator
-- reading these policies in the dashboard will recognise.

create policy "page media is readable by anyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'page-media');

create policy "creators upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'page-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Update needs both: `using` decides which existing objects may be touched,
-- `with check` decides what they may become. Without the second, an owner
-- could rename their object into somebody else's folder.
create policy "creators update their own media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'page-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'page-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "creators delete their own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'page-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Saving a page, all at once
-- ────────────────────────────────────────────────────────────────────────────

-- The editor sends the whole page and this writes the whole page. That is the
-- point: a creator who reorders four blocks, retitles a link and deletes a
-- gallery has made one change to one document, and applying it as nine
-- separate statements from the application means a dropped connection can
-- leave the page in a state the creator never composed — blocks reordered,
-- links not yet written, a links section rendering as empty. Inside one
-- function it is one transaction: all of it lands, or none of it does.
--
-- `security invoker`, emphatically. Every statement below is subject to the
-- same Row Level Security as a statement from the application, so this
-- function grants no authority that the caller did not already have. It is a
-- transaction boundary, not a privilege boundary.
--
-- The owner is `auth.uid()` and is never a parameter. There is no argument a
-- client could set to write somebody else's page, which is a stronger
-- guarantee than validating a profile id would be.
create or replace function public.save_page(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- An empty string is a cleared field, not a value. Storing '' would make
  -- the renderer's "is there a bio" check a string comparison forever.
  update public.profiles
     set display_name = nullif(btrim(payload -> 'profile' ->> 'displayName'), ''),
         bio          = nullif(btrim(payload -> 'profile' ->> 'bio'), ''),
         avatar_url   = nullif(btrim(payload -> 'profile' ->> 'avatarUrl'), '')
   where id = me;

  -- ── Blocks ───────────────────────────────────────────────────────────────
  --
  -- `with ordinality` makes array order the stored position, so the editor
  -- never computes one. Dragging a block is reordering an array and saving it.
  insert into public.blocks (id, profile_id, type, position, data, is_visible)
  select (b.value ->> 'id')::uuid,
         me,
         (b.value ->> 'type')::public.block_type,
         (b.ordinality - 1)::int,
         coalesce(b.value -> 'data', '{}'::jsonb),
         coalesce((b.value ->> 'isVisible')::boolean, true)
    from jsonb_array_elements(coalesce(payload -> 'blocks', '[]'::jsonb))
         with ordinality as b(value, ordinality)
  on conflict (id) do update
     set type       = excluded.type,
         position   = excluded.position,
         data       = excluded.data,
         is_visible = excluded.is_visible;

  -- Anything the creator removed. Deleting a block takes its links with it
  -- through the foreign key, which is why this runs before the link upsert
  -- and not after.
  delete from public.blocks
   where profile_id = me
     and id not in (
       select (b ->> 'id')::uuid
         from jsonb_array_elements(coalesce(payload -> 'blocks', '[]'::jsonb)) b
     );

  -- ── Links ────────────────────────────────────────────────────────────────

  delete from public.links
   where profile_id = me
     and id not in (
       select (l ->> 'id')::uuid
         from jsonb_array_elements(coalesce(payload -> 'blocks', '[]'::jsonb)) b,
              jsonb_array_elements(coalesce(b -> 'links', '[]'::jsonb)) l
     );

  insert into public.links (id, profile_id, block_id, title, url, position, is_active)
  select (l.value ->> 'id')::uuid,
         me,
         (b.value ->> 'id')::uuid,
         l.value ->> 'title',
         l.value ->> 'url',
         (l.ordinality - 1)::int,
         coalesce((l.value ->> 'isActive')::boolean, true)
    from jsonb_array_elements(coalesce(payload -> 'blocks', '[]'::jsonb)) as b(value),
         lateral jsonb_array_elements(coalesce(b.value -> 'links', '[]'::jsonb))
                 with ordinality as l(value, ordinality)
  on conflict (id) do update
     set block_id  = excluded.block_id,
         title     = excluded.title,
         url       = excluded.url,
         position  = excluded.position,
         is_active = excluded.is_active;

  -- ── Social links ─────────────────────────────────────────────────────────
  --
  -- Deleted before inserted, because `social_links` is unique on
  -- (profile_id, platform): swapping a row from Instagram to TikTok while an
  -- old TikTok row is still present would collide with a row that is on its
  -- way out.

  delete from public.social_links
   where profile_id = me
     and id not in (
       select (s ->> 'id')::uuid
         from jsonb_array_elements(coalesce(payload -> 'socials', '[]'::jsonb)) s
     );

  insert into public.social_links (id, profile_id, platform, url, position, is_active)
  select (s.value ->> 'id')::uuid,
         me,
         (s.value ->> 'platform')::public.social_platform,
         s.value ->> 'url',
         (s.ordinality - 1)::int,
         coalesce((s.value ->> 'isActive')::boolean, true)
    from jsonb_array_elements(coalesce(payload -> 'socials', '[]'::jsonb))
         with ordinality as s(value, ordinality)
  on conflict (id) do update
     set platform  = excluded.platform,
         url       = excluded.url,
         position  = excluded.position,
         is_active = excluded.is_active;
end;
$$;

comment on function public.save_page(jsonb) is
  'Replace the calling user''s page in one transaction. security invoker: RLS applies to every statement, and the owner is auth.uid() rather than an argument.';

revoke all on function public.save_page(jsonb) from public;
grant execute on function public.save_page(jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- An email contact is a mailto:, not a workaround
-- ────────────────────────────────────────────────────────────────────────────

-- `social_platform` has had an `email` value since Phase 1, and until now the
-- only way to store one was to dress it up as an https link to somebody's
-- webmail — which picks a mail client on the creator's behalf and breaks for
-- everyone who does not use it.
--
-- `mailto:` is widened into here and nowhere else. It is safe in an href in a
-- way `javascript:` and `data:` are not: it hands the address to the operating
-- system rather than executing anything in the page. `links` keeps the
-- narrower http(s) rule, because a link button that silently opens a mail
-- composer is not what anybody meant to build.
--
-- The pattern is deliberately strict about what follows the scheme: one
-- address, no header injection through `?cc=` or a newline.
alter table public.social_links drop constraint social_links_url_scheme;

alter table public.social_links
  add constraint social_links_url_scheme check (
    url ~* '^https?://'
    or url ~ '^mailto:[^[:space:]@,;:<>()\[\]\\"]+@[^[:space:]@,;:<>()\[\]\\"]+\.[a-zA-Z]{2,}$'
  );
