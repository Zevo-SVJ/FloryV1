import assert from "node:assert/strict";
import { test } from "node:test";

import { toPublicPage, type LinkRow, type ProfileRow, type SocialRow } from "../shape.ts";
import { isEmptyPage } from "../types.ts";
import { parseBlockData } from "../blocks.ts";
import { avatarInitial, renderableAvatarUrl } from "../avatar.ts";

/**
 * Everything that decides what a public page contains.
 *
 * These are the parts that can be wrong without the database being wrong: the
 * order rows come out in, what gets dropped, and what a null column means. The
 * query around them is I/O and is covered by the SQL suite instead.
 */

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

test("a full profile shapes into a page", () => {
  const page = toPublicPage(
    row({
      links: [link()],
      social_links: [social()],
    }),
  );

  assert.equal(page.profile.username, "alex");
  assert.equal(page.profile.displayName, "Alex");
  assert.equal(page.profile.bio, "Creator & entrepreneur");
  assert.deepEqual(page.links, [
    { id: "l1", title: "My shop", url: "https://example.com/shop" },
  ]);
  assert.equal(page.socials[0]?.platform, "instagram");
  assert.equal(isEmptyPage(page), false);
});

test("links come out in position order, deterministically", () => {
  const page = toPublicPage(
    row({
      links: [
        link({ id: "c", title: "Third", position: 2 }),
        link({ id: "a", title: "First", position: 0 }),
        link({ id: "b", title: "Second", position: 1 }),
      ],
    }),
  );

  assert.deepEqual(page.links.map((entry) => entry.title), ["First", "Second", "Third"]);
});

test("rows sharing a position still order the same way every time", () => {
  // Mid-reorder, two links legitimately hold the same position. Without a tie
  // break the page renders differently on two requests for no visible reason.
  const build = () =>
    toPublicPage(
      row({
        links: [
          link({ id: "b", title: "Newer", position: 0, created_at: "2026-02-01T00:00:00Z" }),
          link({ id: "a", title: "Older", position: 0, created_at: "2026-01-01T00:00:00Z" }),
        ],
      }),
    );

  assert.deepEqual(build().links.map((l) => l.title), ["Older", "Newer"]);
  assert.deepEqual(build().links.map((l) => l.title), build().links.map((l) => l.title));
});

test("a link with a dangerous or malformed URL never reaches the page", () => {
  const page = toPublicPage(
    row({
      links: [
        link({ id: "ok", title: "Safe", url: "https://example.com" }),
        link({ id: "js", title: "Tap me", url: "javascript:alert(1)" }),
        link({ id: "data", title: "Tap me", url: "data:text/html,<script>alert(1)</script>" }),
        link({ id: "vb", title: "Tap me", url: "vbscript:msgbox(1)" }),
        link({ id: "junk", title: "Tap me", url: "not a url" }),
      ],
    }),
  );

  assert.deepEqual(page.links.map((entry) => entry.id), ["ok"]);
});

test("a link with no usable title is dropped rather than rendered blank", () => {
  const page = toPublicPage(
    row({ links: [link({ id: "blank", title: "   " }), link({ id: "ok" })] }),
  );

  assert.deepEqual(page.links.map((entry) => entry.id), ["ok"]);
  assert.equal(page.links[0]?.title, "My shop");
});

test("unpublished rows never reach the page, even unfiltered by the caller", () => {
  // Phase 4's preview will hand this function raw editor state. If the filter
  // lived only in the query, a draft would show up in the preview as published.
  const page = toPublicPage(
    row({
      links: [link({ id: "live" }), link({ id: "draft", is_active: false })],
      social_links: [social({ id: "on" }), social({ id: "off", is_active: false })],
      blocks: [
        { id: "shown", type: "text", data: { text: "a" }, position: 0, is_visible: true },
        { id: "hidden", type: "text", data: { text: "b" }, position: 1, is_visible: false },
      ],
    }),
  );

  assert.deepEqual(page.links.map((entry) => entry.id), ["live"]);
  assert.deepEqual(page.socials.map((entry) => entry.id), ["on"]);
  assert.deepEqual(page.blocks.map((entry) => entry.id), ["shown"]);
});

test("empty strings are treated as absent, not rendered", () => {
  const page = toPublicPage(row({ display_name: "   ", bio: "" }));

  assert.equal(page.profile.displayName, null);
  assert.equal(page.profile.bio, null);
});

test("a profile with nothing on it is still a page", () => {
  const page = toPublicPage(row({ links: null, social_links: null, blocks: null }));

  assert.deepEqual(page.links, []);
  assert.deepEqual(page.socials, []);
  assert.deepEqual(page.blocks, []);
  assert.equal(isEmptyPage(page), true);
});

test("no row ever carries profile_id or is_active into the page", () => {
  const page = toPublicPage(
    row({
      links: [link()],
      social_links: [social({ platform: "tiktok", url: "https://tiktok.com/@alex" })],
    }),
  );

  // The shape is the contract: anything extra would end up in the HTML that a
  // stranger receives.
  assert.deepEqual(Object.keys(page.links[0]!).sort(), ["id", "title", "url"]);
  assert.deepEqual(Object.keys(page.socials[0]!).sort(), ["id", "platform", "url"]);
  assert.deepEqual(
    Object.keys(page.profile).sort(),
    ["avatarUrl", "bio", "displayName", "username"],
  );
});

/* ── Blocks ───────────────────────────────────────────────────────────────── */

test("a block is rendered only when its data matches its schema", () => {
  assert.deepEqual(parseBlockData("text", { text: "Hello" }), { text: "Hello" });
  assert.deepEqual(parseBlockData("divider", {}), {});

  assert.equal(parseBlockData("text", {}), null);
  assert.equal(parseBlockData("text", { text: "" }), null);
  assert.equal(parseBlockData("text", { text: 42 }), null);
  assert.equal(parseBlockData("text", null), null);
});

test("a block type the renderer does not implement is dropped", () => {
  // The enum can gain a value before the renderer knows what to do with it.
  for (const type of ["image", "video", "embed", "links", "socials"] as const) {
    assert.equal(parseBlockData(type, { anything: true }), null, type);
  }
});

test("block data is narrowed to the schema, never passed through wholesale", () => {
  const parsed = parseBlockData("text", { text: "Hi", onClick: "alert(1)", html: "<b>x</b>" });

  // Extra keys an attacker or a future migration put in the column must not
  // survive into something a component might spread onto an element.
  assert.deepEqual(parsed, { text: "Hi" });
});

test("blocks keep their position order and drop the invalid ones", () => {
  const page = toPublicPage(
    row({
      blocks: [
        { id: "b2", type: "text", data: { text: "second" }, position: 1, is_visible: true },
        { id: "bad", type: "text", data: { text: "" }, position: 0, is_visible: true },
        { id: "b1", type: "divider", data: {}, position: 0, is_visible: true },
      ],
    }),
  );

  assert.deepEqual(page.blocks.map((block) => block.id), ["b1", "b2"]);
});

/* ── Avatars ──────────────────────────────────────────────────────────────── */

test("an avatar from an unconfigured or foreign host is not loaded", () => {
  // No NEXT_PUBLIC_SUPABASE_URL in the test environment, so every host is
  // foreign — which is the safe default and what a misconfigured deploy gets.
  assert.equal(renderableAvatarUrl("https://evil.example/a.png"), null);
  assert.equal(renderableAvatarUrl("javascript:alert(1)"), null);
  assert.equal(renderableAvatarUrl("not a url"), null);
  assert.equal(renderableAvatarUrl(null), null);
  assert.equal(renderableAvatarUrl(""), null);
});

test("the initial falls back through display name, then username", () => {
  assert.equal(avatarInitial("Alex", "alex"), "A");
  assert.equal(avatarInitial(null, "alex"), "A");
  assert.equal(avatarInitial("   ", "8zevo"), "8");
  // One glyph, not half a surrogate pair.
  assert.equal(avatarInitial("🔥 studio", "alex"), "🔥");
});
