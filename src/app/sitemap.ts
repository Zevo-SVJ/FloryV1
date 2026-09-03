import type { MetadataRoute } from "next";
import { CHUNK_SIZE, chunk, countChunks } from "@/lib/seo/sitemap";
import { siteUrl } from "@/lib/env";

/**
 * The sitemap, in chunks.
 *
 * `generateSitemaps` is the Next.js convention for a set that does not fit in
 * one file, and it serves each chunk at `/sitemap/<n>.xml`. The index that
 * points at them is `/sitemap-index.xml`, and `robots.txt` names that — which
 * is how a crawler finds all of this without guessing.
 *
 * `sitemap` is a reserved username, so `/sitemap/0.xml` can never collide with
 * a creator's page. That was already true before this file existed; the
 * reserved list has held the name since Phase 1.
 *
 * Chunk zero carries the static routes as well. There is exactly one — the
 * landing page — because everything else in the product is either a creator
 * page or behind a session.
 */

/*
 * Rendered per request, not baked into the build.
 *
 * Without this the chunks are prerendered: `sitemap.ts` is cached by default,
 * and a sitemap frozen at build time lists the creators who existed when the
 * deploy happened and nobody since. That is a silent failure — the file is
 * valid, the crawler is happy, and every account created after the last deploy
 * is invisible to search until somebody ships again.
 *
 * Dynamic rather than `revalidate`, because `generateSitemaps` decides how many
 * chunks the route has and is evaluated once. A count that grows past a chunk
 * boundary has to produce a working `/sitemap/1.xml` without a rebuild, and
 * that means the segment cannot be a closed set of prerendered ids.
 */
export const dynamic = "force-dynamic";

export async function generateSitemaps(): Promise<{ id: number }[]> {
  const chunks = await countChunks();
  return Array.from({ length: chunks }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  /** A promise resolving to a string, as of Next.js 16. */
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const index = Number.parseInt(await id, 10);
  const origin = siteUrl().replace(/\/$/, "");

  // A hand-typed `/sitemap/9999.xml` is a request for a chunk that does not
  // exist. An empty sitemap is the correct answer, not a crash.
  if (!Number.isInteger(index) || index < 0) return [];

  const entries: MetadataRoute.Sitemap =
    index === 0
      ? [
          {
            url: origin,
            changeFrequency: "weekly",
            /*
             * The only page in the product that is not a creator's. Its
             * priority is 1 by convention and it is genuinely the root, but
             * priority is advisory and every crawler that matters ignores it —
             * so no creator page below is given a lower one. Ranking twenty
             * thousand creator pages against each other from here would be
             * inventing an order we know nothing about.
             */
            priority: 1,
          },
        ]
      : [];

  for (const creator of await chunk(index)) {
    entries.push({
      url: `${origin}/${creator.username}`,
      lastModified: creator.lastModified,
      /*
       * Weekly, and the same for everybody. A creator who edits daily and one
       * who has not logged in since March are indistinguishable from here
       * without reading their analytics, and `lastModified` already carries
       * the truth a crawler acts on.
       */
      changeFrequency: "weekly",
    });
  }

  return entries;
}

/** Re-exported so the index route and this file cannot disagree about size. */
export { CHUNK_SIZE };
