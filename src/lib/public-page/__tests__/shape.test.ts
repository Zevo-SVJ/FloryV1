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
    { id: "l1", title: "My shop", url: "https://example.com/shop" },
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
