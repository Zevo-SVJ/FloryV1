import assert from "node:assert/strict";
import { test } from "node:test";

import { allow } from "../rate-limit.ts";

/**
 * The brake in front of every public surface.
 *
 * Moved here from the analytics suite in Phase 8, when the limiter stopped
 * being an analytics concern and started guarding the username lookup and the
 * auth actions as well.
 */

test("a key is allowed up to its limit and then refused", () => {
  const key = `test-${Math.random()}`;

  for (let i = 0; i < 5; i += 1) {
    assert.equal(allow(key, 5, 60_000), true, `call ${i + 1}`);
  }
  assert.equal(allow(key, 5, 60_000), false);
});

test("one key's limit does not affect another's", () => {
  const a = `a-${Math.random()}`;
  const b = `b-${Math.random()}`;

  assert.equal(allow(a, 1, 60_000), true);
  assert.equal(allow(a, 1, 60_000), false);
  assert.equal(allow(b, 1, 60_000), true);
});

test("the window expires", async () => {
  const key = `expiring-${Math.random()}`;

  assert.equal(allow(key, 1, 20), true);
  assert.equal(allow(key, 1, 20), false);

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(allow(key, 1, 20), true);
});

