import assert from "node:assert/strict";
import { test } from "node:test";

import { reorderWithin, undoSchema } from "../undo.ts";

/**
 * Putting a page back, and the one property that makes it safe to.
 *
 * `reorderWithin` places only the links it was asked about and leaves every
 * other row where it is. That is what stops an optimization from disturbing
 * something nobody mentioned — an unpublished link sitting at position 3 is
 * not visible to the rules, so it must not be swept to the end by them.
 */

const ids = (rows: { id: string; position: number }[]) =>
  [...rows].sort((a, b) => a.position - b.position).map((row) => row.id);

test("the named links take the slots they occupied between them", () => {
  const all = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const result = reorderWithin(all, ["d", "b", "a", "c"]);

  assert.deepEqual(ids(result), ["d", "b", "a", "c"]);
  assert.deepEqual(
    result.map((row) => row.position),
    [2, 1, 3, 0],
  );
});

test("a link nobody mentioned does not move", () => {
  // `hidden` is at index 1 and is not in the desired order. The two links
  // around it swap; it stays exactly where it was.
  const all = [{ id: "first" }, { id: "hidden" }, { id: "last" }];
  const result = reorderWithin(all, ["last", "first"]);

  const byId = new Map(result.map((row) => [row.id, row.position]));
  assert.equal(byId.get("hidden"), 1);
  assert.equal(byId.get("last"), 0);
  assert.equal(byId.get("first"), 2);
});

test("an empty order changes nothing", () => {
  const all = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(reorderWithin(all, []), [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ]);
});

test("an id that is not on the page is ignored rather than inserted", () => {
  const all = [{ id: "a" }, { id: "b" }];
  const result = reorderWithin(all, ["b", "somebody-elses-link", "a"]);
  assert.deepEqual(ids(result), ["b", "a"]);
  assert.equal(result.length, 2);
});

/* ── The stored payload is never trusted ──────────────────────────────────── */

test("an undo payload is re-parsed before anything is written", () => {
  assert.equal(
    undoSchema.safeParse({
      kind: "positions",
      links: [{ id: "00000000-0000-4000-8000-000000000001", position: 0 }],
    }).success,
    true,
  );
  assert.equal(undoSchema.safeParse({ kind: "positions", links: [{ id: "nope", position: 0 }] }).success, false);
  assert.equal(undoSchema.safeParse({ kind: "delete_everything" }).success, false);
  assert.equal(undoSchema.safeParse(null).success, false);
  assert.equal(
    undoSchema.safeParse({ kind: "featured", linkId: "00000000-0000-4000-8000-000000000001", previous: "yes" })
      .success,
    false,
  );
});
