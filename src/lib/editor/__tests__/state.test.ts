import assert from "node:assert/strict";
import { test } from "node:test";

import {
  draftToPublicPage,
  draftsEqual,
  newBlock,
  newId,
  newLink,
  reorder,
  savePayload,
  type Draft,
  type DraftLink,
} from "../state.ts";
import { savePageSchema } from "../save-schema.ts";

/**
 * The promise the editor makes: what you see is what gets published.
 *
 * These assertions are the mechanism behind that promise. The preview does not
 * render the draft — it reshapes the draft into the rows the database would
 * hold and passes them through the same `toPublicPage` the public route uses.
 * So anything the published page would hide, the preview hides too, and there
 * is no version of "it looked different in the editor" that is not also a bug
 * on the live page.
 */

const draft = (over: Partial<Draft> = {}): Draft => ({
  profile: {
    username: "alex",
    displayName: "Alex",
    bio: "",
    avatarUrl: null,
    searchVisible: true,
  },
  design: {},
  socials: [],
  blocks: [],
  ...over,
});

/** A link with only what the assertion cares about spelled out. */
const link = (over: Partial<DraftLink> = {}): DraftLink => ({
  ...newLink(),
  id: "l1",
  title: "Shop",
  url: "https://example.com",
  ...over,
});

const linksBlock = (over: Partial<ReturnType<typeof newBlock>> = {}) => ({
  ...newBlock("links"),
  links: [link()],
  ...over,
});

/* ── The preview tells the truth ──────────────────────────────────────────── */

test("the preview renders what the page would render", () => {
  const page = draftToPublicPage(draft({ blocks: [linksBlock()] }));

  assert.equal(page.profile.displayName, "Alex");
  assert.equal(page.blocks.length, 1);
  assert.equal(page.blocks[0]?.kind, "links");
});

test("a hidden block is absent from the preview, as it will be from the page", () => {
  const page = draftToPublicPage(
    draft({ blocks: [linksBlock({ isVisible: false })] }),
  );

  assert.deepEqual(page.blocks, []);
});

test("an unpublished link is absent from the preview", () => {
  const page = draftToPublicPage(
    draft({
      blocks: [
        linksBlock({
          links: [
            link({ id: "l1", title: "Live", url: "https://example.com/a", isActive: true }),
            link({ id: "l2", title: "Draft", url: "https://example.com/b", isActive: false }),
          ],
        }),
      ],
    }),
  );

  const block = page.blocks[0];
  assert.equal(block?.kind === "links" && block.links.length, 1);
  assert.equal(JSON.stringify(page).includes("Draft"), false);
});

test("array order becomes page order, with no position arithmetic anywhere", () => {
  const first = newBlock("divider");
  const second = newBlock("text");
  second.data = { text: "second", align: "center", style: "body" };
  const third = newBlock("divider");

  const page = draftToPublicPage(draft({ blocks: [first, second, third] }));

  assert.deepEqual(
    page.blocks.map((block) => block.id),
    [first.id, second.id, third.id],
  );
});

test("links belong to the block they were edited in", () => {
  const a = linksBlock({ links: [link({ id: "a1", title: "A", url: "https://a.example" })] });
  const b = linksBlock({ links: [link({ id: "b1", title: "B", url: "https://b.example" })] });

  const page = draftToPublicPage(draft({ blocks: [a, b] }));
  const [first, second] = page.blocks;

  assert.equal(first?.kind === "links" && first.links[0]?.id, "a1");
  assert.equal(second?.kind === "links" && second.links[0]?.id, "b1");
});

test("an empty display name previews as the username, like the live page", () => {
  const page = draftToPublicPage(
    draft({
      profile: {
        username: "alex",
        displayName: "  ",
        bio: "",
        avatarUrl: null,
        searchVisible: true,
      },
    }),
  );

  assert.equal(page.profile.displayName, null);
});

/* ── Dirty tracking ───────────────────────────────────────────────────────── */

test("a draft equals itself, and stops doing so when something changes", () => {
  const saved = draft({ blocks: [linksBlock()] });
  const copy = structuredClone(saved);

  assert.equal(draftsEqual(saved, copy), true);

  copy.profile.bio = "new";
  assert.equal(draftsEqual(saved, copy), false);
});

test("typing a character and deleting it leaves the page clean again", () => {
  const saved = draft();
  const edited = structuredClone(saved);

  edited.profile.bio = "x";
  assert.equal(draftsEqual(saved, edited), false);

  edited.profile.bio = "";
  assert.equal(draftsEqual(saved, edited), true);
});

test("reordering is a change", () => {
  const a = newBlock("divider");
  const b = newBlock("text");

  const before = draft({ blocks: [a, b] });
  const after = draft({ blocks: [b, a] });

  assert.equal(draftsEqual(before, after), false);
});

/* ── reorder ──────────────────────────────────────────────────────────────── */

test("reorder moves one item and leaves the rest in sequence", () => {
  assert.deepEqual(reorder(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(reorder(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepEqual(reorder(["a", "b", "c"], 1, 0), ["b", "a", "c"]);
});

test("reorder past either end is a no-op rather than a hole in the array", () => {
  const items = ["a", "b", "c"];

  assert.deepEqual(reorder(items, 0, -1), items);
  assert.deepEqual(reorder(items, 2, 3), items);
  assert.deepEqual(reorder(items, 1, 1), items);
  assert.deepEqual(reorder([], 0, 1), []);
});

test("a new block starts with its type's defaults and is visible", () => {
  const block = newBlock("text");

  assert.equal(block.type, "text");
  assert.equal(block.isVisible, true);
  assert.deepEqual(block.links, []);
  assert.deepEqual(block.data, { text: "", align: "center", style: "body" });
  // A real uuid, because it becomes a primary key without a round trip.
  assert.match(block.id, /^[0-9a-f-]{36}$/);
});

/* ── What actually gets sent ──────────────────────────────────────────────── */

/*
 * The editor once built this object inline, listing the profile's fields by
 * hand. When "Show in search" was added the list was not updated, so the
 * switch worked, the page went dirty, the save succeeded — and the setting
 * was thrown away by a `coalesce` in `save_page` that exists to be kind to
 * old clients. Nothing failed anywhere; the toggle simply did not do
 * anything, and only a save-then-reload showed it.
 *
 * These two assertions are the guard. The first says the payload parses as a
 * complete one; the second says every field of the draft's profile except the
 * username — which is not editable — is in it, so a field added to `Draft`
 * cannot be quietly left out of the save.
 */

test("the save payload is a complete, valid page", () => {
  // Real uuids: the schema refuses anything else, which is the point of it.
  const block = { ...newBlock("links"), links: [{ ...newLink(), title: "Shop", url: "https://example.com" }] };
  const parsed = savePageSchema.safeParse(
    savePayload(
      draft({
        blocks: [block],
        socials: [
          { id: newId(), platform: "instagram", url: "https://instagram.com/a", isActive: true },
        ],
      }),
    ),
  );

  assert.equal(parsed.success, true, parsed.error?.message ?? "");
});

test("every editable profile field is sent", () => {
  const source = draft({
    profile: {
      username: "alex",
      displayName: "Alex",
      bio: "Photographer",
      avatarUrl: null,
      searchVisible: false,
    },
  });

  const { profile } = savePayload(source);

  for (const field of Object.keys(source.profile)) {
    if (field === "username") continue;
    assert.ok(field in profile, `${field} is missing from the save payload`);
  }

  // The one the editor used to drop, named explicitly so the reason this test
  // exists survives a refactor of the loop above.
  assert.equal(profile.searchVisible, false);
  assert.equal("username" in profile, false);
});
