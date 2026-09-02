import { checkUrl } from "@/lib/validation/url";
import { parseBlockData } from "@/lib/public-page/blocks";
import { renderableAvatarUrl } from "@/lib/public-page/avatar";
import type { BlockType, Json, SocialPlatform } from "@/types/database";
import type { PublicPage } from "@/lib/public-page/types";

/**
 * Turning database rows into a page.
 *
 * Pure, and deliberately separate from the query that fetches them. Everything
 * that could be wrong about a public page independently of the network lives
 * here — the ordering, what gets dropped, what a null column means — so it can
 * be tested directly instead of only through a live database.
 *
 * Phase 4's live preview shapes editor state through the same function, which
 * is what stops the preview and the published page from disagreeing.
 *
 * It filters unpublished rows itself rather than assuming the caller did. The
 * query does filter, and Row Level Security filters again for an anonymous
 * reader — but this function is the one Phase 4 will hand unfiltered editor
 * state to, and a preview quietly showing drafts as published is exactly the
 * bug that ships.
 */

export interface LinkRow {
  id: string;
  title: string;
  url: string;
  position: number;
  created_at: string;
  is_active: boolean;
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

export function toPublicPage(row: ProfileRow): PublicPage {
  return {
    profile: {
      username: row.username,
      displayName: emptyToNull(row.display_name),
      bio: emptyToNull(row.bio),
      avatarUrl: renderableAvatarUrl(row.avatar_url),
    },

    links: (row.links ?? [])
      .filter((link) => link.is_active)
      .sort(byPosition)
      /*
       * A URL that fails validation here should be impossible: the column has
       * a CHECK constraint and every write goes through `urlSchema`. It is
       * dropped anyway, because "impossible" is a claim about today's code and
       * this one renders an href.
       */
      .filter((link) => checkUrl(link.url) === null && link.title.trim().length > 0)
      .map((link) => ({ id: link.id, title: link.title.trim(), url: link.url })),

    socials: (row.social_links ?? [])
      .filter((social) => social.is_active)
      .sort(byPosition)
      .filter((social) => checkUrl(social.url) === null)
      .map((social) => ({ id: social.id, platform: social.platform, url: social.url })),

    blocks: (row.blocks ?? [])
      .filter((block) => block.is_visible)
      .sort(byPosition)
      .map((block) => ({ block, data: parseBlockData(block.type, block.data) }))
      .filter((entry): entry is { block: BlockRow; data: Record<string, unknown> } =>
        entry.data !== null,
      )
      .map(({ block, data }) => ({ id: block.id, type: block.type, data })),
  };
}
