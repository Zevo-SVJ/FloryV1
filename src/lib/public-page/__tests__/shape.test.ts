import assert from "node:assert/strict";
import { test } from "node:test";

import {
  toPublicPage,
  type BlockRow,
  type LinkRow,
  type ProfileRow,
  type SocialRow,
} from "../shape.ts";
import { isEmptyPage, type PublicBlock } from "../types.ts";
import { avatarInitial, renderableAvatarUrl } from "../avatar.ts";

/**
 * Everything that decides what a public page contains.
 *
 * These are the parts that can be wrong without the database being wrong: the
 * order rows come out in, what gets dropped, and what a null column means. The
 * query around them is I/O and is covered by the SQL suite instead.
 *
 * Phase 4 made blocks the spine, so most of what is asserted here is now about
 * a block's relationship to the rows it owns — a links section that renders
 * only its own links, a gallery that drops an image from a foreign host, a
 * video whose provider no longer resolves.
 */

const LINKS_BLOCK = "b1";

const row = (over: Partial<ProfileRow> = {}): ProfileRow => ({
  username: "alex",
  display_name: "Alex",
  bio: "Creator & entrepreneur",
  avatar_url: null,
  links: [],
  social_links: [],
  blocks: [],
  ...over,
});

const link = (over: Partial<LinkRow> = {}): LinkRow => ({
  id: "l1",
  block_id: LINKS_BLOCK,
  title: "My shop",
  url: "https://example.com/shop",
  position: 0,
  created_at: "2026-01-01T00:00:00Z",
  is_active: true,
  ...over,
});

const social = (over: Partial<SocialRow> = {}): SocialRow => ({
  id: "s1",
  platform: "instagram",
  url: "https://instagram.com/alex",
  position: 0,
  is_active: true,
  ...over,
});

const block = (over: Partial<BlockRow> = {}): BlockRow => ({
  id: LINKS_BLOCK,
  type: "links",
  data: {},
  position: 0,
  is_visible: true,
  ...over,
});

/** Narrow a block from the page, failing the test if it is the wrong kind. */
function only<K extends PublicBlock["kind"]>(
  page: ReturnType<typeof toPublicPage>,
  kind: K,
): Extract<PublicBlock, { kind: K }> {
  const found = page.blocks.find((entry) => entry.kind === kind);
  assert.ok(found, `expected a ${kind} block`);
  return found as Extract<PublicBlock, { kind: K }>;
}

/* ── The page as a whole ──────────────────────────────────────────────────── */

test("a full profile shapes into a page", () => {
  const page = toPublicPage(
    row({
      links: [link()],
      social_links: [social()],
      blocks: [block(), block({ id: "b2", type: "socials", position: 1 })],
    }),
  );

  assert.equal(page.profile.username, "alex");
  assert.equal(page.profile.displayName, "Alex");
  assert.equal(page.profile.bio, "Creator & entrepreneur");

  assert.deepEqual(only(page, "links").links, [
    {
      id: "l1",
      title: "My shop",
      url: "https://example.com/shop",
      featured: false,
      icon: null,
    },
  ]);
  assert.deepEqual(only(page, "socials").socials, [
    { id: "s1", platform: "instagram", url: "https://instagram.com/alex" },
  ]);
});

test("block order is the page order", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({ id: "c", type: "divider", position: 2 }),
        block({ id: "a", type: "text", data: { text: "first" }, position: 0 }),
        block({ id: "b", type: "divider", position: 1 }),
      ],
    }),
  );

  assert.deepEqual(
    page.blocks.map((entry) => entry.id),
    ["a", "b", "c"],
  );
});

test("blocks sharing a position fall back to a stable tie-break", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({ id: "zzz", type: "divider", position: 0 }),
        block({ id: "aaa", type: "divider", position: 0 }),
      ],
    }),
  );

  assert.deepEqual(
    page.blocks.map((entry) => entry.id),
    ["aaa", "zzz"],
  );
});

test("a hidden block never reaches the page", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({ id: "shown", type: "text", data: { text: "visible" } }),
        block({ id: "gone", type: "text", data: { text: "secret" }, is_visible: false }),
      ],
    }),
  );

  assert.equal(page.blocks.length, 1);
  assert.equal(JSON.stringify(page).includes("secret"), false);
});

test("an empty page is empty", () => {
  assert.equal(isEmptyPage(toPublicPage(row())), true);
});

/* ── Links ────────────────────────────────────────────────────────────────── */

test("a links block renders only its own links", () => {
  const page = toPublicPage(
    row({
      links: [
        link({ id: "mine", block_id: "b1" }),
        link({ id: "theirs", block_id: "b2", title: "Other section" }),
      ],
      blocks: [
        block({ id: "b1", position: 0 }),
        block({ id: "b2", position: 1, data: { title: "Shop" } }),
      ],
    }),
  );

  const [first, second] = page.blocks;
  assert.equal(first?.kind === "links" && first.links[0]?.id, "mine");
  assert.equal(second?.kind === "links" && second.links[0]?.id, "theirs");
});

test("links come out in position order, with a deterministic tie-break", () => {
  const page = toPublicPage(
    row({
      links: [
        link({ id: "third", position: 2 }),
        link({ id: "second-b", position: 1, created_at: "2026-01-02T00:00:00Z" }),
        link({ id: "second-a", position: 1, created_at: "2026-01-01T00:00:00Z" }),
        link({ id: "first", position: 0 }),
      ],
      blocks: [block()],
    }),
  );

  assert.deepEqual(
    only(page, "links").links.map((entry) => entry.id),
    ["first", "second-a", "second-b", "third"],
  );
});

test("an inactive link is dropped", () => {
  const page = toPublicPage(
    row({
      links: [link({ id: "live" }), link({ id: "draft", is_active: false })],
      blocks: [block()],
    }),
  );

  assert.deepEqual(
    only(page, "links").links.map((entry) => entry.id),
    ["live"],
  );
});

test("a links block with nothing published in it does not render", () => {
  const page = toPublicPage(
    row({
      links: [link({ is_active: false })],
      blocks: [block()],
    }),
  );

  assert.deepEqual(page.blocks, []);
});

test("a dangerous URL is dropped even though the database should refuse it", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:msgbox(1)"]) {
    const page = toPublicPage(
      row({ links: [link({ url })], blocks: [block()] }),
    );
    assert.deepEqual(page.blocks, [], url);
  }
});

test("a link with a blank title is dropped", () => {
  const page = toPublicPage(
    row({ links: [link({ title: "   " })], blocks: [block()] }),
  );
  assert.deepEqual(page.blocks, []);
});

/* ── Socials ──────────────────────────────────────────────────────────────── */

test("an inactive social link is dropped", () => {
  const page = toPublicPage(
    row({
      social_links: [social({ id: "live" }), social({ id: "off", platform: "tiktok", is_active: false })],
      blocks: [block({ id: "s", type: "socials" })],
    }),
  );

  assert.deepEqual(
    only(page, "socials").socials.map((entry) => entry.id),
    ["live"],
  );
});

test("a mailto social link survives, and a javascript one does not", () => {
  const page = toPublicPage(
    row({
      social_links: [
        social({ id: "mail", platform: "email", url: "mailto:hello@example.com" }),
        social({ id: "bad", platform: "website", url: "javascript:alert(1)" }),
      ],
      blocks: [block({ id: "s", type: "socials" })],
    }),
  );

  assert.deepEqual(
    only(page, "socials").socials.map((entry) => entry.id),
    ["mail"],
  );
});

test("a socials block with nothing active does not render", () => {
  const page = toPublicPage(
    row({
      social_links: [social({ is_active: false })],
      blocks: [block({ id: "s", type: "socials" })],
    }),
  );

  assert.deepEqual(page.blocks, []);
});

/* ── Images ───────────────────────────────────────────────────────────────── */

test("an image on a foreign host is refused", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({
          id: "img",
          type: "image",
          data: { url: "https://evil.example.com/x.png", alt: "", href: null, aspect: "auto" },
        }),
      ],
    }),
  );

  assert.deepEqual(page.blocks, []);
});

test("a gallery drops foreign images and disappears when none are left", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({
          id: "g",
          type: "image_gallery",
          data: {
            title: "Work",
            aspect: "portrait",
            cta: null,
            items: [{ id: "i1", url: "https://evil.example.com/a.png", alt: "", caption: "" }],
          },
        }),
      ],
    }),
  );

  assert.deepEqual(page.blocks, []);
});

/* ── Video and embeds ─────────────────────────────────────────────────────── */

test("a video with an unsupported provider is dropped", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({ id: "v", type: "video", data: { url: "https://example.com/clip.mp4", title: "" } }),
      ],
    }),
  );

  assert.deepEqual(page.blocks, []);
});

test("a Spotify link in a video block is refused, and in an embed block is not", () => {
  const url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";

  const asVideo = toPublicPage(
    row({ blocks: [block({ id: "v", type: "video", data: { url, title: "" } })] }),
  );
  assert.deepEqual(asVideo.blocks, []);

  const asEmbed = toPublicPage(
    row({ blocks: [block({ id: "e", type: "embed", data: { url, title: "" } })] }),
  );
  assert.equal(asEmbed.blocks.length, 1);
});

/* ── Text ─────────────────────────────────────────────────────────────────── */

test("text block defaults are applied to data saved without them", () => {
  const page = toPublicPage(
    row({ blocks: [block({ id: "t", type: "text", data: { text: "Hello" } })] }),
  );

  const text = only(page, "text");
  assert.equal(text.data.align, "center");
  assert.equal(text.data.style, "body");
});

test("a block whose data fails its schema is dropped", () => {
  const page = toPublicPage(
    row({ blocks: [block({ id: "t", type: "text", data: { text: "" } })] }),
  );

  assert.deepEqual(page.blocks, []);
});

/* ── Profile ──────────────────────────────────────────────────────────────── */

test("empty profile strings become null", () => {
  const page = toPublicPage(row({ display_name: "   ", bio: "" }));

  assert.equal(page.profile.displayName, null);
  assert.equal(page.profile.bio, null);
});

test("no database column leaks into the view model", () => {
  const page = toPublicPage(
    row({
      links: [link()],
      social_links: [social()],
      blocks: [block(), block({ id: "s", type: "socials", position: 1 })],
    }),
  );

  const serialized = JSON.stringify(page);
  for (const forbidden of ["profile_id", "is_active", "is_visible", "created_at", "position"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("an avatar is only rendered from our own storage host", () => {
  assert.equal(renderableAvatarUrl("https://evil.example.com/a.png"), null);
  assert.equal(renderableAvatarUrl("http://example.com/a.png"), null);
  assert.equal(renderableAvatarUrl(null), null);
  assert.equal(renderableAvatarUrl("not a url"), null);
});

test("the initial falls back through display name, then username", () => {
  assert.equal(avatarInitial("Alex", "zevo"), "A");
  assert.equal(avatarInitial(null, "zevo"), "Z");
  assert.equal(avatarInitial("  ", "zevo"), "Z");
  // One glyph, not half a surrogate pair.
  assert.equal(avatarInitial("🔥 studio", "zevo"), "🔥");
});

/* ── Phase 7: a link's life, and the blocks that arrived with it ──────────── */

/**
 * The rule these assertions cover is duplicated on purpose, and the
 * duplication is the point. `live links are readable by anyone` in
 * `20260106000001_growth.sql` is what actually decides — a direct query with
 * the anon key gets nothing else. This is the copy that makes the editor's
 * preview tell the same truth, because the preview hands over unfiltered draft
 * state that no policy has ever seen.
 *
 * `toPublicPage` takes the instant as a parameter so a test can stand exactly
 * on a boundary instead of racing the clock.
 */

const AT = new Date("2026-09-10T12:00:00Z");

/** The existing `link` helper — named here for what these assertions are about. */
const scheduled = (over: Partial<LinkRow> = {}): LinkRow => link(over);

test("a link that has not started is absent, exactly as it will be on the page", () => {
  const page = toPublicPage(
    row({
      links: [scheduled({ starts_at: "2026-09-11T00:00:00Z" })],
      blocks: [block()],
    }),
    AT,
  );

  assert.deepEqual(page.blocks, []);
});

test("a link is present from the instant its window opens", () => {
  const opens = row({
    links: [scheduled({ starts_at: "2026-09-10T12:00:00Z" })],
    blocks: [block()],
  });

  // Inclusive at the bottom.
  assert.equal(toPublicPage(opens, AT).blocks.length, 1);
  assert.equal(
    toPublicPage(opens, new Date("2026-09-10T11:59:59.999Z")).blocks.length,
    0,
  );
});

test("a link is gone at the instant its window closes", () => {
  const closes = row({
    links: [scheduled({ ends_at: "2026-09-10T12:00:00Z" })],
    blocks: [block()],
  });

  // Exclusive at the top — the convention every window in the product uses.
  assert.equal(toPublicPage(closes, new Date("2026-09-10T11:59:59.999Z")).blocks.length, 1);
  assert.equal(toPublicPage(closes, AT).blocks.length, 0);
});

test("a schedule cannot resurrect a link its owner switched off", () => {
  const page = toPublicPage(
    row({
      links: [scheduled({ is_active: false, starts_at: "2020-01-01T00:00:00Z" })],
      blocks: [block()],
    }),
    AT,
  );

  assert.deepEqual(page.blocks, []);
});

test("a featured link is marked, and featuring never affects visibility", () => {
  const page = toPublicPage(
    row({
      links: [
        scheduled({ id: "l1", is_featured: true }),
        scheduled({ id: "l2", is_featured: true, starts_at: "2099-01-01T00:00:00Z" }),
      ],
      blocks: [block()],
    }),
    AT,
  );

  const links = only(page, "links").links;
  assert.equal(links.length, 1);
  assert.equal(links[0]?.id, "l1");
  assert.equal(links[0]?.featured, true);
});

test("a platform icon travels, and an uploaded one outside our Storage does not", () => {
  const page = toPublicPage(
    row({
      links: [
        scheduled({ id: "l1", icon_platform: "instagram" }),
        scheduled({ id: "l2", icon_url: "https://evil.example/tracker.png" }),
      ],
      blocks: [block()],
    }),
    AT,
  );

  const links = only(page, "links").links;
  assert.deepEqual(links[0]?.icon, { kind: "platform", platform: "instagram" });
  // Dropped rather than rendered: an icon is a request the page makes.
  assert.equal(links[1]?.icon, null);
});

test("a link with no icon says so, rather than leaving the field undefined", () => {
  const page = toPublicPage(row({ links: [scheduled()], blocks: [block()] }), AT);
  assert.equal(only(page, "links").links[0]?.icon, null);
});

test("the new block types shape into the page", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({ id: "h", type: "heading", data: { text: "My work" }, position: 0 }),
        block({ id: "s", type: "spacer", data: { size: "large" }, position: 1 }),
        block({
          id: "c",
          type: "contact",
          position: 2,
          data: {
            title: "Reach me",
            items: [{ id: "c1", kind: "email", label: "", value: "hi@example.com" }],
          },
        }),
        block({ id: "d", type: "divider", data: { style: "subtle" }, position: 3 }),
      ],
    }),
    AT,
  );

  assert.deepEqual(
    page.blocks.map((entry) => entry.kind),
    ["heading", "spacer", "contact", "divider"],
  );
});

test("a contact block with nothing valid in it is dropped, not rendered empty", () => {
  const page = toPublicPage(
    row({
      blocks: [
        block({
          id: "c",
          type: "contact",
          data: { title: "Reach me", items: [{ id: "c1", kind: "email", value: "nope" }] },
        }),
      ],
    }),
    AT,
  );

  // A heading over nothing is worse than no block at all.
  assert.deepEqual(page.blocks, []);
});

test("search visibility reaches the renderer, and defaults to indexable", () => {
  assert.equal(toPublicPage(row({}), AT).profile.searchVisible, true);
  assert.equal(
    toPublicPage(row({ search_visible: false }), AT).profile.searchVisible,
    false,
  );
  // An older payload that predates the column describes a page that wanted to
  // be found, so absent means true.
  assert.equal(toPublicPage(row({ search_visible: null }), AT).profile.searchVisible, true);
});
