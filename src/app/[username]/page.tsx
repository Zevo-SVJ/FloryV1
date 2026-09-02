import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PublicPage } from "@/components/public/public-page";
import { getPublicPage } from "@/lib/public-page/query";
import { usernameFromPath } from "@/lib/validation/username";

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
  const name = profile.displayName ?? profile.username;
  const url = `/${profile.username}`;

  /*
   * The bio is the description when there is one. When there is not, the
   * fallback names the person rather than describing the product — a hundred
   * creator pages all described as "Create your page on ShowMe" is worse than
   * a short honest sentence, both for a search result and for a link preview.
   */
  const description = profile.bio ?? `${name} on ShowMe.`;

  return {
    // The layout's template appends "· ShowMe", so this is just the creator.
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: name,
      description,
      url,
      siteName: "ShowMe",
      /*
       * The avatar, when there is one this deployment will load. It is square
       * where a preview card wants 1200×630, so platforms crop it — acceptable
       * against having no image at all, and replaced wholesale when Phase 8
       * adds a generated `opengraph-image` to this folder. Nothing else needs
       * to change when it does.
       */
      ...(profile.avatarUrl ? { images: [{ url: profile.avatarUrl }] } : {}),
    },
    twitter: {
      /*
       * `summary`, not `summary_large_image`. The only image this phase can
       * offer is a square avatar, and a page with no avatar has no image at
       * all — asking for the wide card would promise a banner that does not
       * exist. Phase 8's generated 1200x630 card is what earns the large one.
       */
      card: "summary",
      title: name,
      description,
      ...(profile.avatarUrl ? { images: [profile.avatarUrl] } : {}),
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const username = await resolveUsername(params);
  const page = await getPublicPage(username);

  if (!page) notFound();

  return <PublicPage page={page} />;
}
