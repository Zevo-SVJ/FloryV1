import type { SocialPlatform } from "@/types/database";
import type { ResolvedDesign } from "@/lib/design/types";
import type {
  EmbedBlockData,
  GalleryBlockData,
  ImageBlockData,
  LinksBlockData,
  TextBlockData,
  VideoBlockData,
} from "@/lib/blocks/schemas";

/**
 * What a public page is, as the renderer sees it.
 *
 * Deliberately not the database rows. A row carries things a stranger has no
 * business receiving — `profile_id` on every link, `is_active`, timestamps, the
 * owner's uuid — and shipping them inside the server-rendered payload leaks the
 * shape of the schema to anyone who reads the HTML. This is the subset the page
 * actually renders, and the query is written to produce exactly it.
 *
 * Phase 4 made blocks the spine. A page used to be a profile plus three
 * parallel lists; it is now a profile plus an ordered list of blocks, two of
 * which carry rows from their own tables. The change matters because the order
 * a creator arranges is now the order of one array, rather than a convention
 * about which section comes first.
 *
 * The editor's live preview consumes this same type, produced by the same
 * `toPublicPage`, so the two cannot drift apart.
 */

export interface PublicProfile {
  username: string;
  /** Null when the creator has not set one; the renderer falls back. */
  displayName: string | null;
  bio: string | null;
  /** Already checked to be a URL this deployment is willing to load. */
  avatarUrl: string | null;
}

export interface PublicLink {
  /** Row id. A React key, never part of a URL. */
  id: string;
  title: string;
  url: string;
}

export interface PublicSocial {
  id: string;
  platform: SocialPlatform;
  url: string;
}

/**
 * One block, narrowed to what it actually is.
 *
 * A discriminated union rather than `{ type, data: Record<string, unknown> }`,
 * so the renderer destructures real fields and a missing case is a compile
 * error. The narrowing happens once, in `shape.ts`, where the data is
 * validated — after that nothing downstream needs to check anything.
 */
export type PublicBlock =
  | { id: string; kind: "links"; data: LinksBlockData; links: PublicLink[] }
  | { id: string; kind: "socials"; socials: PublicSocial[] }
  | { id: string; kind: "text"; data: TextBlockData }
  | { id: string; kind: "image"; data: ImageBlockData }
  | { id: string; kind: "image_gallery"; data: GalleryBlockData }
  | { id: string; kind: "video"; data: VideoBlockData }
  | { id: string; kind: "embed"; data: EmbedBlockData }
  | { id: string; kind: "divider" };

export interface PublicPage {
  profile: PublicProfile;
  /**
   * How the page looks, with every question already answered.
   *
   * Beside the content rather than inside it. A block knows what it says; the
   * design knows what it looks like; neither reads the other. That separation
   * is what lets a creator try seven themes without a single row of what they
   * wrote being touched.
   */
  design: ResolvedDesign;
  blocks: PublicBlock[];
}

/** Nothing to show, but the page is a real one. */
export const isEmptyPage = (page: PublicPage): boolean => page.blocks.length === 0;
