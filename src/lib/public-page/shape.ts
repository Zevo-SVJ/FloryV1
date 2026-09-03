import { checkUrl, checkSocialUrl } from "@/lib/validation/url";
import { parseBlockData } from "@/lib/blocks/registry";
import { renderableMediaUrl } from "@/lib/media/url";
import { resolveEmbed, EMBED_PROVIDERS, VIDEO_PROVIDERS } from "@/lib/embeds/providers";
import { isLive } from "@/lib/links/schedule";
import type { BlockType, Json, SocialPlatform } from "@/types/database";
import type {
  ContactBlockData,
  DividerBlockData,
  EmbedBlockData,
  GalleryBlockData,
  HeadingBlockData,
  ImageBlockData,
  LinksBlockData,
  SpacerBlockData,
  TextBlockData,
  VideoBlockData,
} from "@/lib/blocks/schemas";
import { parseDesign } from "@/lib/design/schema";
import { resolveDesign } from "@/lib/design/resolve";
import type {
  LinkIcon,
  PublicBlock,
  PublicLink,
  PublicPage,
  PublicSocial,
} from "@/lib/public-page/types";

/**
 * Turning database rows into a page.
 *
 * Pure, and deliberately separate from the query that fetches them. Everything
 * that could be wrong about a public page independently of the network lives
 * here — the ordering, what gets dropped, what a null column means — so it can
 * be tested directly instead of only through a live database.
 *
 * The editor's live preview shapes its draft through this same function, which
 * is what stops the preview and the published page from disagreeing. That is
 * also why it filters unpublished rows itself rather than trusting its caller:
 * the preview hands it unfiltered editor state, and a preview quietly showing
 * drafts as published is exactly the bug that ships.
 */

export interface LinkRow {
  id: string;
  block_id: string;
  title: string;
  url: string;
  position: number;
  created_at?: string;
  is_active: boolean;
  /** Absolute instants. Null on either side means "no bound". */
  starts_at?: string | null;
  ends_at?: string | null;
  is_featured?: boolean;
  icon_platform?: SocialPlatform | null;
  icon_url?: string | null;
}

export interface SocialRow {
  id: string;
  platform: SocialPlatform;
  url: string;
  position: number;
  is_active: boolean;
}

export interface BlockRow {
  id: string;
  type: BlockType;
  data: Json;
  position: number;
  is_visible: boolean;
}

export interface ProfileRow {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** Absent on an older payload, which means the default: indexable. */
  search_visible?: boolean | null;
  /** Presentation only. Parsed and resolved here, never trusted as stored. */
  design?: unknown;
  links: LinkRow[] | null;
  social_links: SocialRow[] | null;
  blocks: BlockRow[] | null;
}

/**
 * Stable ordering, always.
 *
 * `position` is what a creator arranges. It is not unique — two rows can share
 * one, and mid-reorder they will — so ties break on creation time and then on
 * id. Without that last step the same page can come back in a different order
 * on two requests, which reads as a bug and is miserable to reproduce.
 */
function byPosition<T extends { position: number; id: string; created_at?: string }>(
  a: T,
  b: T,
): number {
  return (
    a.position - b.position ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
    a.id.localeCompare(b.id)
  );
}

/** A column someone cleared is empty, not absent. Both mean "do not render". */
function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * The icon a link carries, if it is one we will render.
 *
 * The database refuses both at once, and this prefers the platform mark if a
 * hand-edited row ever managed it — a glyph is already on the page, where an
 * image is a request.
 */
function toLinkIcon(link: LinkRow): LinkIcon | null {
  if (link.icon_platform) return { kind: "platform", platform: link.icon_platform };

  const image = renderableMediaUrl(link.icon_url ?? null);
  return image ? { kind: "image", url: image } : null;
}

/**
 * The links a visitor sees, right now.
 *
 * `isLive` is applied here as well as in the `live links are readable by
 * anyone` policy, and the duplication is deliberate — for the same reason
 * `is_active` was already filtered twice. The policy is what holds against a
 * direct query; this is what makes the editor's preview tell the truth, since
 * the preview hands over unfiltered draft state that no policy has ever seen.
 *
 * `now` is a parameter so the whole function stays pure and a test can stand
 * on either side of a boundary. On the public page it is render time, which
 * interacts with the sixty-second ISR window — see the note on
 * `toPublicPage`.
 */
function toLinks(rows: LinkRow[], now: Date): PublicLink[] {
  return (
    rows
      .filter((link) =>
        isLive(
          {
            isActive: link.is_active,
            startsAt: link.starts_at ?? null,
            endsAt: link.ends_at ?? null,
          },
          now,
        ),
      )
      .sort(byPosition)
      /*
       * A URL that fails validation here should be impossible: the column has
       * a CHECK constraint and every write goes through `urlSchema`. It is
       * dropped anyway, because "impossible" is a claim about today's code and
       * this one renders an href.
       */
      .filter((link) => checkUrl(link.url) === null && link.title.trim().length > 0)
      .map((link) => ({
        id: link.id,
        title: link.title.trim(),
        url: link.url,
        featured: link.is_featured === true,
        icon: toLinkIcon(link),
      }))
  );
}

function toSocials(rows: SocialRow[]): PublicSocial[] {
  return rows
    .filter((social) => social.is_active)
    .sort(byPosition)
    .filter((social) => checkSocialUrl(social.url) === null)
    .map((social) => ({ id: social.id, platform: social.platform, url: social.url }));
}

/**
 * One block, validated and narrowed — or dropped.
 *
 * Null means "do not render this", and there are several ways to earn it: an
 * unknown type, data that fails its schema, a links section with nothing
 * published in it, a video whose URL no longer resolves to a provider. In every
 * case the alternative is worse. A stranger looking at a creator's page should
 * see the page, not the state of our block catalogue.
 */
function toBlock(
  row: BlockRow,
  linksByBlock: Map<string, LinkRow[]>,
  socials: PublicSocial[],
  now: Date,
): PublicBlock | null {
  const data = parseBlockData(row.type, row.data);
  if (data === null) return null;

  switch (row.type) {
    case "links": {
      const links = toLinks(linksByBlock.get(row.id) ?? [], now);
      // An empty section is a heading floating above nothing.
      if (links.length === 0) return null;
      return { id: row.id, kind: "links", data: data as LinksBlockData, links };
    }

    case "socials":
      if (socials.length === 0) return null;
      return { id: row.id, kind: "socials", socials };

    case "text":
      return { id: row.id, kind: "text", data: data as TextBlockData };

    case "heading":
      return { id: row.id, kind: "heading", data: data as HeadingBlockData };

    case "spacer":
      return { id: row.id, kind: "spacer", data: data as SpacerBlockData };

    case "contact": {
      const contact = data as ContactBlockData;
      // Every item failed its schema, or there were never any. Either way an
      // empty contact card is a heading over nothing.
      if (contact.items.length === 0) return null;
      return { id: row.id, kind: "contact", data: contact };
    }

    case "image": {
      const image = data as ImageBlockData;
      // A block whose upload never finished, or whose URL was tampered with.
      if (!renderableMediaUrl(image.url)) return null;
      return { id: row.id, kind: "image", data: image };
    }

    case "image_gallery": {
      const gallery = data as GalleryBlockData;
      const items = gallery.items.filter((item) => renderableMediaUrl(item.url) !== null);
      if (items.length === 0) return null;
      return { id: row.id, kind: "image_gallery", data: { ...gallery, items } };
    }

    case "video": {
      const video = data as VideoBlockData;
      if (!resolveEmbed(video.url, VIDEO_PROVIDERS)) return null;
      return { id: row.id, kind: "video", data: video };
    }

    case "embed": {
      const embed = data as EmbedBlockData;
      if (!resolveEmbed(embed.url, EMBED_PROVIDERS)) return null;
      return { id: row.id, kind: "embed", data: embed };
    }

    case "divider":
      return { id: row.id, kind: "divider", data: data as DividerBlockData };

    default:
      return null;
  }
}

/**
 * @param now The instant the page is being rendered at, which decides which
 *   scheduled links are on it. Injected rather than read, so the function
 *   stays pure and a test can stand exactly on a boundary.
 *
 *   On the public route this is render time, and the route is cached for sixty
 *   seconds — so a link's appearance can lag its start by up to that window.
 *   That is a property of caching a page rather than of scheduling, it is
 *   stated in the editor beside the field, and the alternative — rendering
 *   every creator page dynamically so a schedule is exact to the second —
 *   would cost every visitor a database round trip to serve a minority of
 *   pages that have a schedule at all.
 */
export function toPublicPage(row: ProfileRow, now: Date = new Date()): PublicPage {
  const socials = toSocials(row.social_links ?? []);

  /*
   * Links are grouped by their section here rather than fetched per block, so
   * the whole page still costs one round trip. A link whose block is hidden or
   * gone simply never gets looked up.
   */
  const linksByBlock = new Map<string, LinkRow[]>();
  for (const link of row.links ?? []) {
    const bucket = linksByBlock.get(link.block_id);
    if (bucket) bucket.push(link);
    else linksByBlock.set(link.block_id, [link]);
  }

  const blocks = (row.blocks ?? [])
    .filter((block) => block.is_visible)
    .sort(byPosition)
    .map((block) => toBlock(block, linksByBlock, socials, now))
    .filter((block): block is PublicBlock => block !== null);

  return {
    profile: {
      username: row.username,
      displayName: emptyToNull(row.display_name),
      bio: emptyToNull(row.bio),
      avatarUrl: renderableMediaUrl(row.avatar_url),
      // Absent means indexable: the column defaults to true, and an older
      // payload that predates it describes a page that wanted to be found.
      searchVisible: row.search_visible !== false,
    },
    /*
     * Parsed then resolved, in that order. Parsing discards anything the
     * schema does not recognise — a hand-edited row, a field from a version
     * that has since changed — and resolving fills every remaining gap from
     * the chosen theme, so the renderer receives a complete design or the
     * default one and never something in between.
     */
    design: resolveDesign(parseDesign(row.design)),
    blocks,
  };
}
