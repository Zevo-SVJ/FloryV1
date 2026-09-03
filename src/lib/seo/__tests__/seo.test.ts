import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pageDescription,
  pageName,
  pageTitle,
  readableAddress,
} from "@/lib/seo/page-meta";
import { jsonLd, profilePageData } from "@/lib/seo/structured-data";
import type { PublicPage } from "@/lib/public-page/types";
import { resolveDesign } from "@/lib/design/resolve";

/**
 * What a creator page tells the outside world.
 *
 * Two properties run through all of it. Nothing is invented — no generated
 * description of a person we know nothing about, no keyword list, no claim in
 * a creator's name that they did not make. And nothing private travels: this
 * is the metadata a crawler and a link preview read, and a view count in it
 * would be a leak that no amount of Row Level Security could take back.
 *
 * The escaping assertions at the end are the security half. JSON-LD is the
 * only string in this product handed to a browser inside a `<script>`
 * element, and a bio containing `</script>` is the oldest injection there is.
 */

const profile = (over: Partial<PublicPage["profile"]> = {}): PublicPage["profile"] => ({
  username: "8zevo",
  displayName: "Zevo",
  bio: null,
  avatarUrl: null,
  searchVisible: true,
  ...over,
});

const page = (over: Partial<PublicPage> = {}): PublicPage => ({
  profile: profile(),
  design: resolveDesign({}),
  blocks: [],
  ...over,
});

const URL = "https://showme.at/8zevo";

describe("the name and the title", () => {
  it("uses the display name, and the handle when there is none", () => {
    assert.equal(pageName(profile()), "Zevo");
    assert.equal(pageName(profile({ displayName: null })), "@8zevo");
    // Whitespace is not a name.
    assert.equal(pageName(profile({ displayName: "   " })), "@8zevo");
  });

  it("carries both the name and the handle when they differ", () => {
    // Two different searches — "Zevo" and a half-remembered "@8zevo" — should
    // both land here.
    assert.equal(pageTitle(profile()), "Zevo (@8zevo)");
  });

  it("does not repeat the handle when it is the name", () => {
    assert.equal(pageTitle(profile({ displayName: null })), "@8zevo");
  });

  it("leaves room for the layout's own suffix", () => {
    // The root layout appends " · ShowMe", so the title must not do it too.
    assert.equal(pageTitle(profile()).includes("ShowMe"), false);
  });
});

describe("the description", () => {
  it("is the creator's bio when they wrote one", () => {
    assert.equal(
      pageDescription(profile({ bio: "Photographer in Paris." })),
      "Photographer in Paris.",
    );
  });

  it("collapses a multi-line bio into one line", () => {
    // A meta tag is one line, and a bio with three paragraphs in it would
    // otherwise emit raw newlines into an attribute.
    assert.equal(
      pageDescription(profile({ bio: "Line one\n\n  Line two\ttabbed" })),
      "Line one Line two tabbed",
    );
  });

  it("trims a long bio at a word boundary", () => {
    const long = `${"word ".repeat(60)}end`;
    const described = pageDescription(profile({ bio: long }));

    assert.ok(described.length <= 200, `${described.length} characters`);
    assert.ok(described.endsWith("…"));
    // Cut between words, not through one.
    assert.equal(/\bwor…$/.test(described), false);
  });

  it("falls back to a factual sentence, not a description of the person", () => {
    /*
     * The line this test exists to hold. It would be easy to generate
     * "Creator, entrepreneur and influencer" from nothing, and it would be a
     * fabrication printed under somebody's name in a search result.
     */
    assert.equal(
      pageDescription(profile({ bio: null })),
      "Check out Zevo's links, socials and content on ShowMe.",
    );
    assert.equal(
      pageDescription(profile({ bio: null, displayName: null })),
      "Check out @8zevo's links, socials and content on ShowMe.",
    );
  });

  it("never names a bio that is only whitespace", () => {
    assert.match(pageDescription(profile({ bio: "   " })), /^Check out/);
  });
});

describe("the readable address", () => {
  it("drops the scheme and any trailing slash", () => {
    assert.equal(readableAddress("https://showme.at", "8zevo"), "showme.at/8zevo");
    assert.equal(readableAddress("https://showme.at/", "8zevo"), "showme.at/8zevo");
    assert.equal(readableAddress("http://localhost:3000", "8zevo"), "localhost:3000/8zevo");
  });
});

describe("structured data", () => {
  it("describes a Person inside a ProfilePage", () => {
    const data = profilePageData(page(), URL);

    assert.equal(data["@type"], "ProfilePage");
    assert.equal(data.mainEntity["@type"], "Person");
    assert.equal(data.mainEntity.name, "Zevo");
    assert.equal(data.mainEntity.alternateName, "@8zevo");
    assert.equal(data.mainEntity.url, URL);
    assert.equal(data.url, URL);
  });

  it("omits every field it has no data for", () => {
    const data = profilePageData(page(), URL);

    // Not empty strings, not nulls: absent. A graph padded with blanks is a
    // graph asserting that somebody has no description.
    assert.equal("description" in data.mainEntity, false);
    assert.equal("image" in data.mainEntity, false);
    assert.equal("sameAs" in data.mainEntity, false);
  });

  it("never uses the fallback description as a person's description", () => {
    /*
     * `pageDescription` falls back to "Check out …'s links" for a `<meta>`
     * tag a human reads. Asserting that as a `Person.description` in a
     * machine-readable graph would put our marketing copy in a creator's name.
     */
    const data = profilePageData(page(), URL);
    assert.equal("description" in data.mainEntity, false);

    const withBio = profilePageData(
      page({ profile: profile({ bio: "Photographer in Paris." }) }),
      URL,
    );
    assert.equal(withBio.mainEntity.description, "Photographer in Paris.");
  });

  it("lists social profiles as sameAs, which is the point of emitting any of this", () => {
    const data = profilePageData(
      page({
        blocks: [
          {
            id: "b1",
            kind: "socials",
            socials: [
              { id: "s1", platform: "instagram", url: "https://instagram.com/8zevo" },
              { id: "s2", platform: "youtube", url: "https://youtube.com/@8zevo" },
            ],
          },
        ],
      }),
      URL,
    );

    assert.deepEqual(data.mainEntity.sameAs, [
      "https://instagram.com/8zevo",
      "https://youtube.com/@8zevo",
    ]);
  });

  it("keeps an email address out of sameAs", () => {
    /*
     * A `mailto:` is not an account somebody is "the same as", and an email
     * address in machine-readable page source is a gift to a scraper.
     */
    const data = profilePageData(
      page({
        blocks: [
          {
            id: "b1",
            kind: "socials",
            socials: [
              { id: "s1", platform: "email", url: "mailto:hi@example.com" },
              { id: "s2", platform: "instagram", url: "https://instagram.com/8zevo" },
            ],
          },
        ],
      }),
      URL,
    );

    assert.deepEqual(data.mainEntity.sameAs, ["https://instagram.com/8zevo"]);
  });

  it("asserts nothing it cannot know", () => {
    /*
     * Read back through JSON, which is the form a crawler actually receives —
     * so this checks the emitted document rather than the shape of the type
     * that produced it.
     */
    const person = (
      JSON.parse(jsonLd(profilePageData(page({ profile: profile({ bio: "Hi" }) }), URL))) as {
        mainEntity: Record<string, unknown>;
      }
    ).mainEntity;

    for (const invented of [
      "jobTitle",
      "worksFor",
      "knowsAbout",
      "aggregateRating",
      "interactionStatistic",
      "email",
      "address",
    ]) {
      assert.equal(invented in person, false, invented);
    }
  });
});

describe("the JSON-LD script body", () => {
  it("round-trips to the same object", () => {
    const data = profilePageData(page({ profile: profile({ bio: "Photographer" }) }), URL);
    assert.deepEqual(JSON.parse(jsonLd(data)), data);
  });

  it("cannot close the script element it sits in", () => {
    /*
     * The whole reason `jsonLd` exists. Without the escaping, a bio containing
     * `</script>` ends the element and everything after it is parsed as HTML.
     */
    const attacks = [
      "</script><img src=x onerror=alert(1)>",
      "<!--<script>",
      "]]><script>alert(1)</script>",
      "</SCRIPT >",
    ];

    for (const bio of attacks) {
      const body = jsonLd(profilePageData(page({ profile: profile({ bio }) }), URL));

      assert.equal(body.includes("<"), false, bio);
      assert.equal(body.includes(">"), false, bio);
      assert.equal(body.includes("&"), false, bio);
      // And it is still the same text once parsed.
      const parsed = JSON.parse(body) as { mainEntity: { description?: string } };
      assert.equal(parsed.mainEntity.description, bio);
    }
  });

  it("escapes a hostile display name too, not only the bio", () => {
    const body = jsonLd(
      profilePageData(page({ profile: profile({ displayName: "</script>x" }) }), URL),
    );
    assert.equal(body.includes("<"), false);
  });
});
