-- ShowMe — how a page looks
--
-- Phase 4 let creators say what is on their page. Phase 5 lets them say how it
-- looks, and the whole of that is one column.
--
-- One JSONB column rather than a table of settings, or a column per option.
-- The reasons are the same three every time this choice comes up:
--
--   · It is read exactly when the profile is read — on every public page
--     render — so a separate table would be a join on the hottest query in the
--     product, for a row that is always exactly one.
--
--   · The shape will change. A theme gains an option, a background gains a
--     mode; each of those is a migration against a wide table and a no-op
--     against JSONB with a schema in front of it.
--
--   · Nothing queries it. No feature will ever ask "which creators use the
--     Noir theme" in a way that a column would serve better than a GIN index
--     added later.
--
-- What keeps JSONB honest is that it is never trusted. `src/lib/design/schema.ts`
-- parses it on the way in and on the way out, defaults every missing field, and
-- drops anything it does not recognise — so a hand-edited row renders as the
-- default design rather than as broken CSS.
--
-- Row Level Security needs no change. `design` lives on `profiles`, which is
-- already world-readable and owner-writable, and that is exactly right: a
-- page's appearance is as public as the page.

alter table public.profiles
  add column design jsonb not null default '{}'::jsonb;

comment on column public.profiles.design is
  'Presentation only: theme, colours, background, typography, button and layout choices. Never content. Validated by src/lib/design/schema.ts on read and write; an unreadable value renders as the default design.';

-- An object, and a small one.
--
-- The type check is the same one `blocks.data` carries, for the same reason: a
-- bare string or an array here would be a shape nothing downstream expects.
-- The size limit is what stops this column from becoming somewhere to put
-- things — a full design is a few hundred bytes, and eight kilobytes is roomy
-- enough that no legitimate value approaches it.
alter table public.profiles
  add constraint profiles_design_is_object check (jsonb_typeof(design) = 'object'),
  add constraint profiles_design_size check (pg_column_size(design) <= 8192);

-- ────────────────────────────────────────────────────────────────────────────
-- save_page, extended
-- ────────────────────────────────────────────────────────────────────────────

-- Design travels with the same save as content, so a creator who changes their
-- theme and retitles a link presses Save once and gets one transaction. The
-- alternative — a second action for design — would mean two things that can
-- disagree about whether they were saved.
--
-- `payload -> 'design'` is written verbatim because the application has already
-- parsed it against the design schema and re-serialized what came back. This
-- function's job is atomicity, not validation; the same is true of the block
-- data it has always written.
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
  -- `design` is absent from an older client's payload rather than null, and
  -- `coalesce` keeps that from wiping a creator's theme: a payload that does
  -- not mention design leaves design alone.
  update public.profiles
     set display_name = nullif(btrim(payload -> 'profile' ->> 'displayName'), ''),
         bio          = nullif(btrim(payload -> 'profile' ->> 'bio'), ''),
         avatar_url   = nullif(btrim(payload -> 'profile' ->> 'avatarUrl'), ''),
         design       = coalesce(payload -> 'design', design)
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
  'Replace the calling user''s page and its design in one transaction. security invoker: RLS applies to every statement, and the owner is auth.uid() rather than an argument.';
