import assert from "node:assert/strict";
import { test } from "node:test";

import { BLOCKS, BLOCK_MENU_ORDER, parseBlockData } from "../registry.ts";
import { savePageSchema } from "../../editor/save-schema.ts";

/**
 * The registry, and the schemas it holds.
 *
 * Two kinds of assertion here. The first is about the registry staying whole —
 * every type in the menu, every default valid, nothing missing — because those
 * are the failures that produce a blank panel rather than an error. The second
 * is about what each schema refuses, which is what stands between JSONB and
 * the page.
 */

const TYPES = Object.keys(BLOCKS) as (keyof typeof BLOCKS)[];

test("every registered block type appears in the add menu, and vice versa", () => {
  assert.deepEqual([...BLOCK_MENU_ORDER].sort(), [...TYPES].sort());
});

test("every block's defaults parse against its own schema", () => {
  for (const type of TYPES) {
    const definition = BLOCKS[type];
    const parsed = definition.schema.safeParse(definition.defaults());

    /*
     * Several types start empty on purpose: a freshly added Image has no
     * image and a freshly added Text has no words, and the editor is where
     * they get filled. Their defaults are expected to fail until then — the
     * save action turns that failure into "this block is empty" rather than
     * into a schema message.
     */
    const startsEmpty = [
      "text",
      "heading",
      "image",
      "image_gallery",
      "video",
      "embed",
      "contact",
    ].includes(type);
    assert.equal(parsed.success, !startsEmpty, type);
  }
});

test("every block has a label and a description a creator could read", () => {
  for (const type of TYPES) {
    const { label, description } = BLOCKS[type];
    assert.ok(label.length > 0 && label.length < 20, type);
    assert.ok(description.endsWith("."), `${type} description should be a sentence`);
  }
});

test("only the socials block is single-use", () => {
  const single = TYPES.filter((type) => !BLOCKS[type].multiple);
  assert.deepEqual(single, ["socials"]);
});

/* ── What the schemas refuse ──────────────────────────────────────────────── */

test("an unknown block type parses to nothing", () => {
  assert.equal(parseBlockData("carousel_3d", { anything: true }), null);
});

test("text is required, trimmed and capped", () => {
  assert.equal(parseBlockData("text", { text: "" }), null);
  assert.equal(parseBlockData("text", { text: "   " }), null);
  assert.equal(parseBlockData("text", { text: "x".repeat(1001) }), null);

  const parsed = parseBlockData("text", { text: "  hello  " });
  assert.equal(parsed?.text, "hello");
});

test("an unknown alignment is refused rather than coerced", () => {
  assert.equal(parseBlockData("text", { text: "hi", align: "justify" }), null);
});

test("parsing applies defaults, so an old row comes back complete", () => {
  assert.deepEqual(parseBlockData("text", { text: "hi" }), {
    text: "hi",
    align: "center",
    style: "body",
  });
});

test("parsing drops a key nobody declared", () => {
  const parsed = parseBlockData("text", { text: "hi", onClick: "alert(1)" });
  assert.equal("onClick" in (parsed ?? {}), false);
});

test("an image outside our storage is refused", () => {
  assert.equal(
    parseBlockData("image", { url: "https://evil.example.com/x.png" }),
    null,
  );
});

test("a gallery with more than twenty-four images is refused", () => {
  const items = Array.from({ length: 25 }, (_, index) => ({
    id: `i${index}`,
    url: "https://example.supabase.co/x.png",
    alt: "",
    caption: "",
  }));
  assert.equal(parseBlockData("image_gallery", { items }), null);
});

test("a video URL is validated by resolving it, not by pattern", () => {
  assert.equal(parseBlockData("video", { url: "https://example.com/clip.mp4" }), null);
  assert.equal(parseBlockData("video", { url: "https://youtu.be/dQw4w9WgXcQ" })?.url,
    "https://youtu.be/dQw4w9WgXcQ");
});

/* ── The save payload ─────────────────────────────────────────────────────── */

const payload = (over: Record<string, unknown> = {}) => ({
  profile: { displayName: "Alex", bio: "", avatarUrl: null },
  design: {},
  socials: [],
  blocks: [],
  ...over,
});

const ID = "8f1c0e4a-2b6d-4c1f-9a3e-5d7b8c0e1f22";
const ID2 = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";

test("a valid page is accepted", () => {
  const result = savePageSchema.safeParse(
    payload({
      blocks: [
        {
          id: ID,
          type: "links",
          data: { title: "Latest" },
          isVisible: true,
          links: [
            { id: ID2, title: "Shop", url: "example.com/shop", isActive: true },
          ],
        },
      ],
    }),
  );

  assert.equal(result.success, true);
  // The bare domain was normalized on the way through.
  assert.equal(result.data?.blocks[0]?.links[0]?.url, "https://example.com/shop");
});

test("a payload with no design at all is accepted, and leaves design alone", () => {
  const { design: _design, ...withoutDesign } = payload();
  void _design;

  const result = savePageSchema.safeParse(withoutDesign);
  assert.equal(result.success, true);
  assert.equal(result.data?.design, undefined);
});

test("the payload has no way to name an owner", () => {
  const result = savePageSchema.safeParse(
    payload({ profile: { displayName: "x", bio: "", avatarUrl: null }, profile_id: "someone" }),
  );

  assert.equal(result.success, true);
  assert.equal("profile_id" in (result.data ?? {}), false);
});

test("an id that is not a uuid is refused before it reaches SQL", () => {
  const result = savePageSchema.safeParse(
    payload({
      blocks: [{ id: "'; drop table links;--", type: "divider", data: {}, isVisible: true, links: [] }],
    }),
  );

  assert.equal(result.success, false);
});

test("a dangerous link URL is refused by the save payload", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox(1)"]) {
    const result = savePageSchema.safeParse(
      payload({
        blocks: [
          {
            id: ID,
            type: "links",
            data: {},
            isVisible: true,
            links: [{ id: ID2, title: "x", url, isActive: true }],
          },
        ],
      }),
    );
    assert.equal(result.success, false, url);
  }
});

test("a mailto is accepted for a social link and refused for a page link", () => {
  const asSocial = savePageSchema.safeParse(
    payload({
      socials: [{ id: ID, platform: "email", url: "hello@example.com", isActive: true }],
    }),
  );
  assert.equal(asSocial.success, true);
  assert.equal(asSocial.data?.socials[0]?.url, "mailto:hello@example.com");

  const asLink = savePageSchema.safeParse(
    payload({
      blocks: [
        {
          id: ID,
          type: "links",
          data: {},
          isVisible: true,
          links: [{ id: ID2, title: "Email", url: "mailto:hello@example.com", isActive: true }],
        },
      ],
    }),
  );
  assert.equal(asLink.success, false);
});

test("a block whose data fails its schema fails the whole save", () => {
  const result = savePageSchema.safeParse(
    payload({
      blocks: [{ id: ID, type: "text", data: { text: "" }, isVisible: true, links: [] }],
    }),
  );

  assert.equal(result.success, false);
  // Pathed at the block, so the action can name which one and open it.
  assert.deepEqual(result.error?.issues[0]?.path.slice(0, 2), ["blocks", 0]);
});

/* ── Phase 7: the new blocks, and the ones that grew ──────────────────────── */

test("a heading has a level, and no way to reach h1", () => {
  const parsed = BLOCKS.heading.schema.safeParse({ text: "My work" });
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data.level, "section");

  /*
   * The page's `h1` is the creator's name. A block that could emit another
   * would give a page two competing titles — so the level is a two-member
   * enum and there is no numeric field to widen.
   */
  for (const level of ["h1", "title", 1, "page"]) {
    assert.equal(
      BLOCKS.heading.schema.safeParse({ text: "x", level }).success,
      false,
      String(level),
    );
  }
});

test("a heading refuses to be empty, so no page grows a blank heading", () => {
  assert.equal(BLOCKS.heading.schema.safeParse({ text: "  " }).success, false);
});

test("a spacer takes a named size and never a number of pixels", () => {
  assert.equal(BLOCKS.spacer.schema.safeParse({ size: "large" }).success, true);

  for (const size of [24, "24px", "huge", ""]) {
    assert.equal(BLOCKS.spacer.schema.safeParse({ size }).success, false, String(size));
  }
});

test("a divider has three treatments and no colour of its own", () => {
  for (const style of ["line", "subtle", "space"]) {
    assert.equal(BLOCKS.divider.schema.safeParse({ style }).success, true, style);
  }
  assert.equal(BLOCKS.divider.schema.safeParse({ style: "dotted" }).success, false);
  // A colour would be a creator value becoming CSS, which the design system
  // exists to prevent. It takes the page's own text token instead.
  const parsed = BLOCKS.divider.schema.safeParse({ style: "line", color: "#ff0000" });
  assert.equal(parsed.success && "color" in parsed.data, false);
});

test("a links block is a stack or a grid, and nothing else", () => {
  assert.equal(BLOCKS.links.schema.safeParse({}).success, true);
  assert.equal(
    BLOCKS.links.schema.safeParse({}).success &&
      BLOCKS.links.schema.parse({}).layout,
    "list",
  );
  assert.equal(BLOCKS.links.schema.safeParse({ layout: "grid" }).success, true);
  assert.equal(BLOCKS.links.schema.safeParse({ layout: "masonry" }).success, false);
});

test("a contact block refuses to be empty and caps how long it gets", () => {
  const email = { id: "c1", kind: "email", label: "", value: "hi@example.com" };

  assert.equal(BLOCKS.contact.schema.safeParse({ items: [email] }).success, true);
  assert.equal(BLOCKS.contact.schema.safeParse({ items: [] }).success, false);
  assert.equal(
    BLOCKS.contact.schema.safeParse({
      items: Array.from({ length: 7 }, (_, i) => ({ ...email, id: `c${i}` })),
    }).success,
    false,
  );
});

test("a text block can be aligned three ways now, and still refuses a fourth", () => {
  for (const align of ["left", "center", "right"]) {
    assert.equal(BLOCKS.text.schema.safeParse({ text: "x", align }).success, true, align);
  }
  assert.equal(BLOCKS.text.schema.safeParse({ text: "x", align: "justify" }).success, false);
});
