import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * The creator pages a search engine should crawl.
 *
 * The shape of this file is a decision about scale. A sitemap that builds an
 * array of every profile in memory works beautifully at a thousand creators
 * and falls over at a million — and the failure is not gradual: it is one
 * request that allocates a few hundred megabytes and takes the process with
 * it. So this reads one bounded page at a time, and the route above it splits
 * the whole set into chunks of five thousand.
 *
 * Five thousand rather than the protocol's fifty thousand, deliberately. The
 * limit that bites first is not the URL count but the response: fifty thousand
 * entries is several megabytes of XML built from a single query, which is a
 * slow request and a large allocation for no benefit. Chunks are cheap, and a
 * crawler is perfectly happy with twenty of them.
 *
 * ── What is listed ─────────────────────────────────────────────────────────
 *
 * Claimed usernames whose owner has not turned search visibility off, and
 * nothing else. The query runs through the session-less public client, so
 * every row it can see is a row an anonymous visitor could already read by
 * visiting the address — there is no path here to a private column, and the
 * only fields selected are the username and when the page last changed.
 *
 * `/dashboard`, `/editor`, `/onboarding`, `/login`, `/signup`, `/api` and
 * `/go` are absent because they are not content: they are behind a session, or
 * they are a redirect. `robots.txt` says the same thing to a crawler that
 * arrives without reading this.
 */

/** Creators per sitemap chunk. */
export const CHUNK_SIZE = 5000;

export interface SitemapEntry {
  username: string;
  lastModified: Date;
}

/**
 * How many chunks the whole set needs.
 *
 * A `head` count rather than fetching rows to measure them. Always at least
 * one, so a brand-new deployment with no creators still serves a valid — and
 * empty — sitemap rather than a 404 that a crawler will remember.
 */
export async function countChunks(): Promise<number> {
  if (!isSupabaseConfigured()) return 1;

  try {
    const supabase = createPublicClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("username", { count: "exact", head: true })
      .eq("search_visible", true)
      .not("username_claimed_at", "is", null);

    if (error || count === null) return 1;
    return Math.max(1, Math.ceil(count / CHUNK_SIZE));
  } catch {
    return 1;
  }
}

/**
 * One page of creators, in a stable order.
 *
 * Ordered by username rather than by creation time, because a range query over
 * an unstable order is how an entry ends up in two chunks or in none: a signup
 * between chunk three and chunk four shifts every row after it. Usernames are
 * write-once and unique, so the order is fixed for as long as an account
 * exists — which is exactly the property a paged crawl needs.
 *
 * Returns an empty page rather than throwing. A sitemap that 500s while the
 * database is briefly unreachable is a sitemap a crawler retries; a sitemap
 * that lists nothing for one request is one it re-reads tomorrow. Neither is
 * good, and only the first can turn into a de-indexing.
 */
export async function chunk(index: number): Promise<SitemapEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const from = index * CHUNK_SIZE;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("username, updated_at")
      .eq("search_visible", true)
      .not("username_claimed_at", "is", null)
      .order("username", { ascending: true })
      .range(from, from + CHUNK_SIZE - 1);

    if (error || !data) return [];

    return data.map((row) => ({
      username: row.username,
      /*
       * `updated_at` on the profile, which the `save_page` transaction touches
       * on every save — so it moves whenever a creator changes anything about
       * their page, which is what `lastmod` is supposed to mean.
       */
      lastModified: new Date(row.updated_at),
    }));
  } catch {
    return [];
  }
}
