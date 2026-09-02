import type { BlockType, SocialPlatform } from "@/types/database";

/**
 * What a public page is, as the renderer sees it.
 *
 * Deliberately not the database rows. A row carries things a stranger has no
 * business receiving — `profile_id` on every link, `is_active`, timestamps, the
 * owner's uuid — and shipping them inside the server-rendered payload leaks
 * the shape of the schema to anyone who reads the HTML. This is the subset the
 * page actually renders, and the query is written to produce exactly it.
 *
 * Phase 4's live preview consumes the same type, so the editor and the public
 * page cannot drift apart.
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

export interface PublicBlock {
  id: string;
  type: BlockType;
  /** Parsed and validated against the block's own schema. Never raw JSON. */
  data: Record<string, unknown>;
}

export interface PublicPage {
  profile: PublicProfile;
  links: PublicLink[];
  socials: PublicSocial[];
  blocks: PublicBlock[];
}

/** Nothing to show, but the page is a real one. */
export const isEmptyPage = (page: PublicPage): boolean =>
  page.links.length === 0 && page.socials.length === 0 && page.blocks.length === 0;
