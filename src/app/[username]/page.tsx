import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PublicPage } from "@/components/public/public-page";
import { getPublicPage } from "@/lib/public-page/query";
import { pageDescription, pageTitle } from "@/lib/seo/page-meta";
import { jsonLd, profilePageData } from "@/lib/seo/structured-data";
import { usernameFromPath } from "@/lib/validation/username";
import { siteUrl } from "@/lib/env";

/**
 * The public creator page — showme.at/<username>.
 *
 * The route this product exists to serve. It is opened from a TikTok bio on a
 * phone by someone who will give it about a second, so everything here is
 * arranged around arriving fast: a session-less query so the response can be
 * cached, one round trip to the database, and no client JavaScript at all.
 */

interface PageProps {
  params: Promise<{ username: string }>;
}

/**
 * Cache the rendered page for a minute.
 *
 * The trade is between a creator seeing an edit appear and a visitor waiting
 * on a database round trip. Sixty seconds is short enough that nothing is
 * meaningfully stale and long enough to absorb the traffic spike that follows
 * a link being posted.
 *
 * It is also only the ceiling. `revalidatePublicPage()` drops an entry
 * immediately, and Phase 4 calls it after every edit — sixty seconds is what
 * happens when something changes outside the editor, not the normal path.
 */
export const revalidate = 60;

/**
 * No pages are built ahead of time, but the route is prerenderable.
 *
 * Without this export Next.js treats a dynamic segment as fully dynamic and
 * renders it on every request — `revalidate` above would have no effect, which
 * is a quiet way to lose the caching entirely. Returning an empty list says
 * "nothing to build now, cache what you render", and `dynamicParams` defaults
 * to true so unknown usernames still resolve.
 *
 * Prebuilding anything here would mean enumerating every creator at build time,
 * which gets slower with every signup and is stale the moment somebody joins.
 */
export function generateStaticParams(): { username: string }[] {
  return [];
}

/**
 * One page, one address.
 *
 * `/Alex` and `/alex` are the same person, so only the lowercase form renders
 * and the rest redirect permanently — links, analytics and search results
 * never fragment across spellings.
 *
 * `/john.doe` is not a username at all, so it is a 404 rather than a redirect
 * to `/johndoe`: inventing an address nobody asked for could send a visitor to
 * a stranger's page.
 */
async function resolveUsername(params: PageProps["params"]): Promise<string> {
  const { username: raw } = await params;
  const resolved = usernameFromPath(raw);

  if (resolved.kind === "canonical") return resolved.username;
  // 308, not 307: this mapping never changes, so intermediaries may remember it.
  if (resolved.kind === "redirect") permanentRedirect(`/${resolved.username}`);
  notFound();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const username = await resolveUsername(params);
  const page = await getPublicPage(username);

  /*
   * An unclaimed name has no metadata to describe.
   *
   * What this returns barely matters: when the page body calls `notFound()`,
   * Next.js renders the not-found boundary with the root layout's metadata and
   * its own `noindex`, and this object is discarded. Verified — the 404 comes
   * back with exactly one `robots` tag. So this states the same intent rather
   * than a second, contradictory one: a name nobody has claimed is not content,
   * and indexing it would fill search results with pages that exist only
   * because somebody mistyped a link.
   */
  if (!page) return { robots: { index: false, follow: false } };

  const { profile } = page;
  const title = pageTitle(profile);
  const description = pageDescription(profile);
  const url = `/${profile.username}`;

  return {
    // The layout's template appends "· ShowMe".
    title,
    description,
    /*
     * One address per page, always the lowercase one, always absolute against
     * `metadataBase`. `/Alex` and `/a.lex` never render — they redirect or
     * 404 — so there is exactly one URL that can carry this tag, and no
     * trailing slash anywhere: Next.js is configured without them, so
     * `/alex/` and `/alex` cannot both exist to be canonicalised apart.
     */
    alternates: { canonical: url },
    /*
     * Indexable unless the creator said otherwise.
     *
     * A page exists to be found, so the default is to be found. When a
     * creator turns search visibility off the page still works for anybody
     * holding the address — it is a bio link, it has to — and this is the
     * half of that setting search engines read. The other half is the
     * sitemap, which stops listing it.
     */
    robots: profile.searchVisible
      ? undefined
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      siteName: "ShowMe",
      /*
       * No `images` here on purpose. `opengraph-image.tsx` in this folder
       * generates a 1200×630 card and Next.js attaches it — including its
       * type, width and height, which a hand-written entry would have to
       * repeat and could get wrong. Listing an image here would produce two
       * `og:image` tags and let platforms choose.
       */
    },
    twitter: {
      /*
       * `summary_large_image`, now that there is a real wide card to show.
       * Phase 6 deliberately asked for the small card, because the only image
       * then was a square avatar and requesting the banner would have promised
       * something that did not exist.
       */
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const username = await resolveUsername(params);
  const page = await getPublicPage(username);

  if (!page) notFound();

  const url = `${siteUrl()}/${page.profile.username}`;

  return (
    <>
      {/*
        * Schema.org, as the page's own script rather than through a metadata
        * field — Next.js has no `Metadata` entry for JSON-LD, and the
        * documented way is exactly this.
        *
        * The serialization escapes `<`, `>` and `&`, which is what keeps a bio
        * containing `</script>` from ending the element and turning the rest
        * of the object into markup. That escaping is the one thing in this
        * file that has to be right; `lib/seo/structured-data.ts` explains it
        * and the tests attack it.
        */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(profilePageData(page, url)) }}
      />

      <PublicPage page={page} design={page.design} address={url} tracked />
    </>
  );
}
