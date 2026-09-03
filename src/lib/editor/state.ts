import { BLOCKS } from "@/lib/blocks/registry";
import { toPublicPage, type ProfileRow } from "@/lib/public-page/shape";
import type { PublicPage } from "@/lib/public-page/types";
import type { BlockType, Json, SocialPlatform } from "@/types/database";
import type { DesignConfig } from "@/lib/design/types";

/**
 * The page as the editor holds it.
 *
 * A draft, in memory, that the creator changes freely and saves once. That is
 * the shape of this whole feature: no request per keystroke, no half-applied
 * page if the network drops mid-edit, and a preview that updates at the speed
 * of typing because nothing has to travel anywhere first.
 *
 * It is close to the database rows but not identical. Ids are strings the
 * client generates for new rows, so a block can be dragged, previewed and
 * given links before it exists anywhere — and `is_active` is `isActive`,
 * because this is the application's vocabulary rather than Postgres's.
 *
 * Client-safe on purpose: this module is imported by the editor in the browser
 * and by the save action on the server, and both need the same idea of what a
 * page is.
 */

export interface DraftLink {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  /**
   * Absolute instants, ISO-8601, or null for "no bound".
   *
   * Stored as instants rather than as a wall-clock time and a zone, which is
   * what makes the editor and the public page incapable of disagreeing about
   * when a link appears. See `lib/links/schedule.ts`.
   */
  startsAt: string | null;
  endsAt: string | null;
  isFeatured: boolean;
  /** One of the platform marks, or an uploaded image. Never both. */
  iconPlatform: SocialPlatform | null;
  iconUrl: string | null;
}

/** A link with nothing decided about it yet. */
export function newLink(): DraftLink {
  return {
    id: newId(),
    title: "",
    url: "",
    isActive: true,
    startsAt: null,
    endsAt: null,
    isFeatured: false,
    iconPlatform: null,
    iconUrl: null,
  };
}

export interface DraftSocial {
  id: string;
  platform: SocialPlatform;
  url: string;
  isActive: boolean;
}

export interface DraftBlock {
  id: string;
  type: BlockType;
  /** Validated against the type's schema on save, and before every preview. */
  data: Record<string, unknown>;
  isVisible: boolean;
  /** Only meaningful for a links block; empty everywhere else. */
  links: DraftLink[];
}

export interface DraftProfile {
  /** Write-once, and shown so the creator can see the address they own. */
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  /** Whether the page asks to be indexed and appears in the sitemap. */
  searchVisible: boolean;
}

export interface Draft {
  profile: DraftProfile;
  /**
   * The creator's design overrides, exactly as stored.
   *
   * The sparse config rather than the resolved one, because that is what gets
   * saved: a page on Noir with nothing else changed stores `{"theme":"noir"}`
   * and keeps receiving Noir's decisions as the theme is refined. Resolving
   * happens at render, in the same function the public page uses.
   */
  design: DesignConfig;
  /**
   * Page-level rather than inside the socials block, because the database
   * holds one row per platform per creator. Two blocks cannot disagree about
   * which platforms exist if there is only one list.
   */
  socials: DraftSocial[];
  blocks: DraftBlock[];
}

/**
 * An id for something that does not exist in the database yet.
 *
 * A real uuid, because it becomes a primary key without a round trip: the row
 * can be dragged, previewed and given links before it exists anywhere, and the
 * save is an upsert rather than an insert-then-relabel. Generating it on the
 * client is safe for the same reason the whole payload is — the server takes
 * the owner from the session, so an invented id buys a row of your own and a
 * stolen one is refused by Row Level Security.
 */
export const newId = (): string => crypto.randomUUID();

export function newBlock(type: BlockType): DraftBlock {
  return {
    id: newId(),
    type,
    data: BLOCKS[type].defaults() as Record<string, unknown>,
    isVisible: true,
    links: [],
  };
}

/**
 * The draft, rendered exactly as the world would see it.
 *
 * The reason the preview cannot drift from the published page: it is not a
 * second renderer reading a second model. The draft is reshaped into the same
 * rows the database would hold and passed through the same `toPublicPage`,
 * which applies the same filters — hidden blocks vanish, unpublished links
 * vanish, a block with invalid data is dropped — before the same components
 * draw it.
 *
 * The one thing it cannot show is a page that was saved from another tab. That
 * is a property of a draft, not a bug in the preview.
 *
 * `now` is threaded through so a scheduled link is absent from the preview for
 * exactly the reason it will be absent from the page — the same comparison,
 * not a second one written to look like it.
 */
export function draftToPublicPage(draft: Draft, now: Date = new Date()): PublicPage {
  const row: ProfileRow = {
    username: draft.profile.username,
    display_name: draft.profile.displayName,
    bio: draft.profile.bio,
    avatar_url: draft.profile.avatarUrl,
    search_visible: draft.profile.searchVisible,

    links: draft.blocks.flatMap((block) =>
      block.links.map((link, index) => ({
        id: link.id,
        block_id: block.id,
        title: link.title,
        url: link.url,
        position: index,
        is_active: link.isActive,
        starts_at: link.startsAt,
        ends_at: link.endsAt,
        is_featured: link.isFeatured,
        icon_platform: link.iconPlatform,
        icon_url: link.iconUrl,
      })),
    ),

    social_links: draft.socials.map((social, index) => ({
      id: social.id,
      platform: social.platform,
      url: social.url,
      position: index,
      is_active: social.isActive,
    })),

    design: draft.design,

    blocks: draft.blocks.map((block, index) => ({
      id: block.id,
      type: block.type,
      // `Json` is a recursive union that a plain `Record<string, unknown>`
      // does not structurally satisfy, even though every value in a draft is
      // one. The cast is the honest way to say so; the schema on the way in
      // and the schema on the way out are what actually guarantee the shape.
      data: block.data as Json,
      position: index,
      is_visible: block.isVisible,
    })),
  };

  return toPublicPage(row, now);
}

/**
 * Whether the page as saved and the page as edited are the same.
 *
 * Structural equality over a JSON round trip. The draft is a tree of plain
 * data with no cycles and no undefined, which is exactly the case where
 * `JSON.stringify` is a correct comparison rather than a lazy one — and key
 * order is stable because both sides are built by the same code paths.
 */
export const draftsEqual = (a: Draft, b: Draft): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Move an item, returning a new array. Used by both drag and the arrow keys. */
export function reorder<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}
