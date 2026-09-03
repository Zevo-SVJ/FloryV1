import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { BLOCKS } from "@/lib/blocks/registry";
import type { Draft, DraftBlock, DraftLink, DraftSocial } from "@/lib/editor/state";
import type { BlockType, SocialPlatform } from "@/types/database";

/**
 * The page a creator is about to edit.
 *
 * The mirror of `public-page/query.ts`, and different from it in exactly two
 * ways. It runs with the creator's session, so Row Level Security hands back
 * drafts and hidden blocks as well as published ones — the editor has to show
 * what is there, not what the world sees. And it does not drop invalid rows:
 * a block whose data no longer fits its schema is repaired against the type's
 * defaults rather than made to disappear, because a creator who cannot see a
 * block cannot fix or delete it.
 *
 * One round trip, one embedded select, like the public page. A creator on a
 * phone opening the editor should not wait on four queries either.
 */

interface LinkRow {
  id: string;
  block_id: string;
  title: string;
  url: string;
  position: number;
  created_at: string;
  is_active: boolean;
}

interface SocialRow {
  id: string;
  platform: SocialPlatform;
  url: string;
  position: number;
  is_active: boolean;
}

interface BlockRow {
  id: string;
  type: BlockType;
  data: unknown;
  position: number;
  is_visible: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  links: LinkRow[] | null;
  social_links: SocialRow[] | null;
  blocks: BlockRow[] | null;
}

const QUERY = `
  id,
  username,
  display_name,
  bio,
  avatar_url,
  links (id, block_id, title, url, position, created_at, is_active),
  social_links (id, platform, url, position, is_active),
  blocks (id, type, data, position, is_visible, created_at)
` as const;

export class EditorLoadError extends Error {
  constructor() {
    super("Could not load your page.");
    this.name = "EditorLoadError";
  }
}

/** Same tie-breaks as the public renderer, so the editor lists what it draws. */
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

/**
 * A block's data, made usable.
 *
 * Parsing applies the schema's defaults, so a block saved before a field
 * existed comes back complete. When parsing fails outright — hand-edited JSON,
 * a type whose shape changed — the block keeps its identity and gets fresh
 * defaults, which is recoverable. Dropping it would leave the creator with a
 * page they cannot fix and a row they cannot see.
 */
function repairBlockData(type: BlockType, data: unknown): Record<string, unknown> {
  const parsed = BLOCKS[type].schema.safeParse(data ?? {});
  return parsed.success
    ? (parsed.data as Record<string, unknown>)
    : (BLOCKS[type].defaults() as Record<string, unknown>);
}

export const getEditorDraft = cache(async (): Promise<Draft> => {
  const profile = await requireClaimedProfile();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(QUERY)
    .eq("id", profile.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) throw new EditorLoadError();

  const linksByBlock = new Map<string, DraftLink[]>();
  for (const link of (data.links ?? []).slice().sort(byPosition)) {
    const draft: DraftLink = {
      id: link.id,
      title: link.title,
      url: link.url,
      isActive: link.is_active,
    };
    const bucket = linksByBlock.get(link.block_id);
    if (bucket) bucket.push(draft);
    else linksByBlock.set(link.block_id, [draft]);
  }

  const blocks: DraftBlock[] = (data.blocks ?? []).slice().sort(byPosition).map((block) => ({
    id: block.id,
    type: block.type,
    data: repairBlockData(block.type, block.data),
    isVisible: block.is_visible,
    links: linksByBlock.get(block.id) ?? [],
  }));

  const socials: DraftSocial[] = (data.social_links ?? [])
    .slice()
    .sort(byPosition)
    .map((social) => ({
      id: social.id,
      platform: social.platform,
      url: social.url,
      isActive: social.is_active,
    }));

  return {
    profile: {
      username: data.username,
      displayName: data.display_name ?? "",
      bio: data.bio ?? "",
      avatarUrl: data.avatar_url,
    },
    socials,
    blocks,
  };
});
