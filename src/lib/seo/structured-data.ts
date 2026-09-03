import { pageDescription, pageName } from "@/lib/seo/page-meta";
import type { PublicPage } from "@/lib/public-page/types";

/**
 * Schema.org data for a creator page.
 *
 * A `ProfilePage` whose `mainEntity` is a `Person`, which is what this page
 * literally is — one person's own page about themselves. It is emitted because
 * two of its properties do real work: `sameAs` is how a search engine learns
 * that this page, an Instagram account and a YouTube channel are the same
 * person, and that is the single most useful thing structured data can say
 * about a link-in-bio page. `name` and `image` feed the knowledge panel.
 *
 * What is not here is the point. There is no `interactionStatistic` (that
 * would be view counts, which are private), no `aggregateRating` (nobody has
 * rated anything), no `jobTitle`, `worksFor` or `knowsAbout` (we have no idea),
 * and no `Organization` wrapper claiming a creator is a business. Structured
 * data that asserts something unverifiable is worse than none: it is a claim
 * made in a creator's name, and search engines penalise it.
 *
 * Every field is omitted when the underlying data is absent, so a page with no
 * bio, no avatar and no socials produces a small, entirely true object rather
 * than one padded with empty strings.
 */

interface PersonData {
  "@type": "Person";
  name: string;
  alternateName: string;
  url: string;
  description?: string;
  image?: string;
  sameAs?: string[];
}

export interface ProfilePageData {
  "@context": "https://schema.org";
  "@type": "ProfilePage";
  url: string;
  mainEntity: PersonData;
}

export function profilePageData(page: PublicPage, url: string): ProfilePageData {
  const { profile } = page;

  const person: PersonData = {
    "@type": "Person",
    name: pageName(profile),
    alternateName: `@${profile.username}`,
    url,
  };

  /*
   * Only a bio the creator actually wrote. `pageDescription` falls back to a
   * sentence about ShowMe when there is none, which is right for a `<meta>`
   * tag a human reads in a search result and wrong here — asserting
   * "Check out @alex's links" as a person's `description` in a machine-readable
   * graph is putting our marketing copy in their name.
   */
  if (profile.bio) person.description = pageDescription(profile);

  // Already narrowed to our own Storage host by `renderableMediaUrl`.
  if (profile.avatarUrl) person.image = profile.avatarUrl;

  /*
   * `sameAs` is the whole reason this object earns its bytes: it is the claim
   * that the person on this page is the person behind these accounts.
   *
   * Only `http(s)` addresses. A contact row can be a `mailto:`, which is not
   * an account somebody is "the same as" — and an email address in
   * machine-readable page source is a gift to a scraper.
   */
  const sameAs = page.blocks
    .filter((block): block is Extract<typeof block, { kind: "socials" }> =>
      block.kind === "socials",
    )
    .flatMap((block) => block.socials)
    .map((social) => social.url)
    .filter((address) => /^https?:\/\//i.test(address));

  if (sameAs.length > 0) person.sameAs = [...new Set(sameAs)];

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: person,
  };
}

/**
 * The object, as text safe to put inside a `<script>` element.
 *
 * This is the only place in the whole product where a string is handed to the
 * browser inside a script tag, so it gets the attention that deserves. `<` is
 * escaped as `<`, which is what closes the hole: without it a bio
 * containing `</script>` ends the element early and everything after it is
 * parsed as HTML — the oldest JSON-in-HTML injection there is. `>` and `&` go
 * with it, so no `<!--` or `]]>` sequence can start something either.
 *
 * All three are valid JSON escapes, so the document a parser sees is
 * byte-identical to the object that went in.
 */
export function jsonLd(data: ProfilePageData): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
