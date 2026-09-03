-- ShowMe — growth features
--
-- Phase 7 is about a page being shared, found and revisited. Three things in
-- this migration serve that, and the first is the only one with a security
-- property attached.
--
--   1. A link now has a life. It can start in the future, it can end, it can
--      be featured, and it can carry an icon. "Not visible yet" and "no longer
--      visible" are decided by the database, in the policy that governs who
--      may read the row at all — not by a filter the application has to
--      remember, and emphatically not by JavaScript hiding an element that a
--      visitor can still read in the page source.
--
--   2. A creator can keep their page out of search. Public pages are indexable
--      by default, because being found is the point; a creator who wants the
--      address to work only for the people they hand it to can say so, and
--      then the page carries `noindex` and never appears in the sitemap.
--
--   3. `save_page` writes all of it, in the same single transaction it always
--      has.
--
-- No new table. A schedule is two columns on the row it schedules, and a
-- contact block's actions are its own JSON. Both were considered as tables and
-- both would have been a join for data that has no life of its own.

-- ────────────────────────────────────────────────────────────────────────────
-- A link's life
-- ────────────────────────────────────────────────────────────────────────────

alter table public.links
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column is_featured boolean not null default false,
  -- Exactly one of these, or neither. A platform mark reuses the eighteen
  -- glyphs the socials row already ships, at no additional weight; an uploaded
  -- icon lives in `page-media` under the owner's own folder like every other
  -- image. There is deliberately no third option: fetching a favicon from a
  -- creator-supplied host would make this server issue requests to arbitrary
  -- addresses on a creator's behalf, which is the definition of SSRF.
  add column icon_platform public.social_platform,
  add column icon_url text;

comment on column public.links.starts_at is
  'An absolute instant before which the link is not publicly readable. Null means "already live".';
comment on column public.links.ends_at is
  'An absolute instant at which the link stops being publicly readable. Null means "no end". Exclusive: at exactly ends_at the link is gone.';
comment on column public.links.is_featured is
  'Presentation only — the link renders with more weight. Never affects whether it is readable.';

alter table public.links
  -- A window that ends before it begins is a link nobody would ever see. The
  -- editor cannot produce one; a direct POST can, and this is the refusal.
  add constraint links_schedule_order check (
    starts_at is null or ends_at is null or ends_at > starts_at
  ),
  add constraint links_icon_one_of check (
    icon_platform is null or icon_url is null
  ),
  -- `https` only, unlike `links_url_scheme`, which allows http for a
  -- destination somebody might genuinely still be serving that way. An icon is
  -- an <img> on an https page: http would be blocked as mixed content and show
  -- as a broken image rather than as no icon at all.
  add constraint links_icon_url_scheme check (icon_url is null or icon_url ~ '^https://'),
  add constraint links_icon_url_length check (char_length(icon_url) <= 2048);

-- ────────────────────────────────────────────────────────────────────────────
-- Scheduling is a policy, not a filter
-- ────────────────────────────────────────────────────────────────────────────

-- The old policy said "a link is public while is_active". This one says "while
-- is_active and inside its window", which moves scheduling from something the
-- renderer does to something the database does.
--
-- That distinction is the whole feature. Every reader of a link goes through
-- this policy: the public page's session-less query, a direct `supabase-js`
-- call from a browser console, and — the one that matters most — the `/go/<id>`
-- redirect, which now refuses a scheduled or expired link without a single
-- line of application code being added to it. A link that has not started is
-- indistinguishable from one that does not exist, which is the correct answer
-- to a stranger asking about a drop that has not happened yet.
--
-- The owner's own `owners read all their links` policy is untouched, so the
-- editor still sees every link it is supposed to manage.
--
-- `now()` is evaluated once per statement and lives in `pg_catalog`, so it
-- resolves regardless of the caller's search_path.
drop policy "active links are readable by anyone" on public.links;

create policy "live links are readable by anyone"
  on public.links for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Search visibility
-- ────────────────────────────────────────────────────────────────────────────

-- Default true: a creator page exists to be found, and a product that hides
-- every page by default is a product whose growth loop does not turn.
--
-- This is not a privacy control and the column name says so. The page stays
-- readable by anyone with the address — it has to, because that address is in
-- somebody's bio — and turning this off only removes the page from the
-- sitemap and asks crawlers not to index it. Anything stronger would be a
-- different feature with a different name.
alter table public.profiles
  add column search_visible boolean not null default true;

comment on column public.profiles.search_visible is
  'Whether the public page asks to be indexed and appears in the sitemap. Not an access control: the page is readable by anyone holding the address either way.';

-- Only rows that want indexing are ever enumerated for the sitemap, and it is
-- read in username order, one page at a time.
create index profiles_search_visible_idx
  on public.profiles (username)
  where search_visible;

-- ────────────────────────────────────────────────────────────────────────────
-- Saving a page, now including a link's life
-- ────────────────────────────────────────────────────────────────────────────

-- Replaced wholesale rather than patched, because a `create or replace` of a
-- plpgsql function is the whole body either way and a diff of the new columns
-- against the old text would be harder to audit than the function itself.
--
-- Everything that was true before is still true. `security invoker`, so Row
-- Level Security applies to every statement inside it; the owner is
-- `auth.uid()` and never an argument; and the whole page lands in one
-- transaction or none of it does.
--
-- The new fields follow the same rule as the old ones: they are read out of
-- the payload with `->>` and cast, so a value of the wrong shape aborts the
-- transaction rather than being coerced into something plausible. The zod
-- schema in `src/lib/editor/save-schema.ts` is what turns that into a sentence
-- a creator can read; this is what makes it impossible to get past.
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
  --
  -- Two columns coalesce to their stored value rather than to a default, and
  -- for the same reason: `design` since Phase 5 and `search_visible` since
  -- this migration are both absent from an older client's payload rather than
  -- null, and a client that has never heard of a setting must not be able to
  -- reset it by saving a link.
  --
  -- `design` is repeated here because this function is replaced whole. That is
  -- the hazard of `create or replace` on a body several phases deep, and the
  -- reason it was caught rather than shipped is that
  -- `supabase/tests/04_editor.sql` asserts a theme survives a save — so
  -- dropping this line failed the suite immediately.
  update public.profiles
     set display_name   = nullif(btrim(payload -> 'profile' ->> 'displayName'), ''),
         bio            = nullif(btrim(payload -> 'profile' ->> 'bio'), ''),
         avatar_url     = nullif(btrim(payload -> 'profile' ->> 'avatarUrl'), ''),
         design         = coalesce(payload -> 'design', design),
         search_visible = coalesce(
           (payload -> 'profile' ->> 'searchVisible')::boolean,
           search_visible
         )
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

  -- `nullif(..., '')` before the timestamptz cast: the editor sends an empty
  -- string for "no schedule" in some paths and a JSON null in others, and
  -- `''::timestamptz` is an error where `null::timestamptz` is the answer.
  --
  -- The instants arrive as ISO-8601 strings with an explicit offset, so the
  -- cast is unambiguous and the server's own timezone never enters into it.
  insert into public.links (
    id, profile_id, block_id, title, url, position, is_active,
    starts_at, ends_at, is_featured, icon_platform, icon_url
  )
  select (l.value ->> 'id')::uuid,
         me,
         (b.value ->> 'id')::uuid,
         l.value ->> 'title',
         l.value ->> 'url',
         (l.ordinality - 1)::int,
         coalesce((l.value ->> 'isActive')::boolean, true),
         nullif(btrim(l.value ->> 'startsAt'), '')::timestamptz,
         nullif(btrim(l.value ->> 'endsAt'), '')::timestamptz,
         coalesce((l.value ->> 'isFeatured')::boolean, false),
         nullif(btrim(l.value ->> 'iconPlatform'), '')::public.social_platform,
         nullif(btrim(l.value ->> 'iconUrl'), '')
    from jsonb_array_elements(coalesce(payload -> 'blocks', '[]'::jsonb)) as b(value),
         lateral jsonb_array_elements(coalesce(b.value -> 'links', '[]'::jsonb))
                 with ordinality as l(value, ordinality)
  on conflict (id) do update
     set block_id      = excluded.block_id,
         title         = excluded.title,
         url           = excluded.url,
         position      = excluded.position,
         is_active     = excluded.is_active,
         starts_at     = excluded.starts_at,
         ends_at       = excluded.ends_at,
         is_featured   = excluded.is_featured,
         icon_platform = excluded.icon_platform,
         icon_url      = excluded.icon_url;

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
