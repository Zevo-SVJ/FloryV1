import { countChunks } from "@/lib/seo/sitemap";
import { siteUrl } from "@/lib/env";

/**
 * The sitemap index — one document naming every chunk.
 *
 * `app/sitemap.ts` with `generateSitemaps` produces the chunks themselves at
 * `/sitemap/0.xml`, `/sitemap/1.xml` and so on, and Next.js does not generate
 * an index for them. Without one a crawler has to be told each chunk
 * separately, which means `robots.txt` grows a line per five thousand
 * creators and a stale `robots.txt` silently hides the newest ones.
 *
 * So the index lives here, at its own path, and `robots.txt` names it alone.
 * A separate path rather than `/sitemap.xml` because that route belongs to
 * `sitemap.ts` — two files claiming one URL is a build error waiting to
 * happen, and the filename is not what a crawler cares about.
 *
 * Written as a route handler and not a metadata convention because Next.js has
 * a file convention for a sitemap and none for an index. Fifteen lines of XML
 * with the two characters that matter escaped is a smaller thing to own than a
 * workaround.
 */

/*
 * Never prerendered: the number of chunks depends on how many creators exist,
 * which is not a build-time fact.
 */
export const dynamic = "force-dynamic";

/**
 * XML text escaping.
 *
 * The only value substituted below is our own origin, so this is not guarding
 * against user input — it is guarding against an origin with an `&` in it,
 * which is a malformed document rather than an injection. `'` and `"` are
 * escaped too, since one day something here may end up in an attribute.
 */
const escape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET(): Promise<Response> {
  const origin = siteUrl().replace(/\/$/, "");
  const chunks = await countChunks();

  const entries = Array.from(
    { length: chunks },
    (_, index) => `  <sitemap><loc>${escape(`${origin}/sitemap/${index}.xml`)}</loc></sitemap>`,
  ).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      /*
       * An hour at the edge, a day while it is being refreshed. A crawler that
       * reads this every few minutes should not cost a count query each time,
       * and an index that is an hour behind lists one fewer chunk than it
       * might — which the next read corrects.
       */
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
