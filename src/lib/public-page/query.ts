import "server-only";

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import { toPublicPage, type ProfileRow } from "@/lib/public-page/shape";
import type { PublicPage } from "@/lib/public-page/types";

/**
 * Reading a public page.
 *
 * One function, one round trip, one shape. Everything the renderer needs
 * arrives from a single embedded select rather than four queries fanned out
 * across the component tree — on a page opened from a phone on mobile data,
 * three extra round trips to the database are three extra round trips.
 *
 * The client has no session (`createPublicClient`), so Row Level Security
 * evaluates every row as `anon`. That is the backstop. The filters below are
 * the actual rule: relying on RLS alone to hide unpublished links would mean a
 * signed-in creator opening their own public URL saw drafts on it, and the
 * whole point of this page is that it shows what the world sees.
 *
 * Shaping the rows into a page is `shape.ts`, which is pure and tested on its
 * own. This file is only the I/O.
 */

/** The lookup itself failed — not "no such user". */
export class PublicPageError extends Error {
  constructor() {
    super("Could not reach the profile store.");
    this.name = "PublicPageError";
  }
}

/*
 * Named columns, never `*`.
 *
 * A `select("*")` would put `profile_id`, `is_active` and the owner's uuid into
 * the server-rendered payload of a public page. Listing columns keeps the
 * schema out of the HTML and makes an accidental exposure a visible diff.
 */
const QUERY = `
  username,
  display_name,
  bio,
  avatar_url,
  links (id, title, url, position, created_at, is_active),
  social_links (id, platform, url, position, is_active),
  blocks (id, type, data, position, is_visible)
` as const;

/**
 * Everything the public page renders, for one username.
 *
 * Returns null when nobody has claimed the name. Throws `PublicPageError` when
 * the lookup failed, because the two must not both become a 404 — a page that
 * 404s while the database is down gets de-indexed, where a 500 is retried.
 *
 * Memoized per render pass, so `generateMetadata` and the page body share one
 * query instead of making two.
 */
export const getPublicPage = cache(async (username: string): Promise<PublicPage | null> => {
  // No database configured is not a failure: the deployment has no profiles,
  // and every name is genuinely unclaimed.
  if (!isSupabaseConfigured()) return null;

  let row: ProfileRow | null;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(QUERY)
      .eq("username", username)
      // Published content only. RLS says the same thing for an anonymous
      // reader; this says it for every reader.
      .eq("links.is_active", true)
      .eq("social_links.is_active", true)
      .eq("blocks.is_visible", true)
      .maybeSingle<ProfileRow>();

    if (error) throw new PublicPageError();
    row = data;
  } catch (cause) {
    if (cause instanceof PublicPageError) throw cause;
    throw new PublicPageError();
  }

  return row ? toPublicPage(row) : null;
});
