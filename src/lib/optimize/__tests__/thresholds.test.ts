import assert from "node:assert/strict";
import { test } from "node:test";

import { confidenceFor, weakest } from "../thresholds.ts";

/**
 * Confidence is arithmetic on a sample, not an opinion a rule holds.
 *
 * The boundary that matters most is the first one: below the floor there is no
 * confidence at all, and `null` is what tells a rule to say nothing. A feature
 * that reported "early signal" for two clicks would be worse than one that
 * reported nothing, because it would look like knowledge.
 */

test("below the floor there is no confidence, only silence", () => {
  assert.equal(confidenceFor(0, 40), null);
  assert.equal(confidenceFor(39, 40), null);
  assert.equal(confidenceFor(40, 40), "early");
});

test("confidence rises with the sample, at three times and ten times the floor", () => {
  assert.equal(confidenceFor(40, 40), "early");
  assert.equal(confidenceFor(119, 40), "early");
  assert.equal(confidenceFor(120, 40), "medium");
  assert.equal(confidenceFor(399, 40), "medium");
  assert.equal(confidenceFor(400, 40), "high");
  assert.equal(confidenceFor(50_000, 40), "high");
});

test("a claim resting on two samples is only as strong as the weaker", () => {
  assert.equal(weakest("high", "early"), "early");
  assert.equal(weakest("early", "high"), "early");
  assert.equal(weakest("medium", "high"), "medium");
  assert.equal(weakest("high", "high"), "high");
});
