import assert from "node:assert/strict";
import { test } from "node:test";

import { optimizationScore } from "../score.ts";
import { metrics, page } from "./fixtures.ts";

/**
 * The score, and the two properties that make it worth showing.
 *
 * It is never invented — below a hundred views there is no number at all — and
 * a check with no data behind it is removed from the denominator rather than
 * counted as a failure. The second is the difference between a score that
 * describes a new page and one that punishes it for being new.
 */

test("a page nobody has visited has no score, and says what it is waiting for", () => {
  const score = optimizationScore(metrics({ views: 0, clicks: 0 }));

  assert.equal(score.value, null);
  assert.deepEqual(score.blockedBy, { needed: 100, have: 0, what: "views" });
  // The profile and housekeeping checks still run: they need no visitors.
  assert.ok(score.checks.some((check) => check.id === "profile"));
  assert.ok(score.pending.some((item) => item.label === "Click-through rate"));
});

test("a page just short of the floor still has no score", () => {
  assert.equal(optimizationScore(metrics({ views: 99, clicks: 30 })).value, null);
  assert.notEqual(optimizationScore(metrics({ views: 100, clicks: 30 })).value, null);
});

test("checks with no data are left out of the total rather than scored as zero", () => {
  // 100 views, 3 clicks: enough for a click-through rate, not enough to rank
  // links. A page like this must not be marked down for the ranking it cannot
  // have.
  const thin = optimizationScore(
    page([{ title: "A", clicks: 2 }, { title: "B", clicks: 1 }, { title: "C", clicks: 0 }], {
      views: 100,
    }),
  );

  const ids = thin.checks.map((check) => check.id);
  assert.deepEqual(ids.sort(), ["ctr", "hygiene", "profile"]);
  assert.ok(thin.pending.some((item) => item.label === "Order vs clicks"));

  const total = thin.checks.reduce((sum, check) => sum + check.weight, 0);
  assert.equal(total, 55, "only the applicable checks are in the denominator");
});

test("a well-ordered page with a complete profile scores near the top", () => {
  const score = optimizationScore(
    page(
      [
        { title: "YouTube", clicks: 300, over: { isFeatured: true } },
        { title: "Instagram", clicks: 120 },
        { title: "Shop", clicks: 60 },
        { title: "Website", clicks: 20 },
      ],
      { views: 1200 },
    ),
  );

  assert.ok(score.value !== null && score.value >= 90, `expected a high score, got ${score.value}`);
  assert.ok(score.checks.every((check) => check.verdict !== "poor"));
});

test("a page whose best link is buried loses the check that says so, and only that", () => {
  const score = optimizationScore(
    page(
      [
        { title: "Website", clicks: 20 },
        { title: "Instagram", clicks: 60 },
        { title: "Shop", clicks: 30 },
        { title: "YouTube", clicks: 400 },
      ],
      { views: 1200 },
    ),
  );

  const position = score.checks.find((check) => check.id === "top_link_position");
  assert.ok(position);
  assert.equal(position.verdict, "poor");
  assert.match(position.detail, /YouTube takes 78\.4% of clicks and sits at #4\./);

  const ordering = score.checks.find((check) => check.id === "ordering");
  assert.ok(ordering);
  assert.match(ordering.detail, /link pairs are in the opposite order/);
});

test("every missing profile field is named, and nothing is invented about it", () => {
  const score = optimizationScore(
    metrics({
      views: 500,
      clicks: 100,
      profile: { hasAvatar: false, hasDisplayName: true, hasBio: false, socialCount: 0 },
    }),
  );

  const profile = score.checks.find((check) => check.id === "profile");
  assert.ok(profile);
  assert.equal(profile.earned, 5);
  assert.equal(profile.detail, "Missing a photo, a bio and social links.");
});

test("an expired link left on the page costs housekeeping points", () => {
  const clean = optimizationScore(page([{ title: "A", clicks: 50 }], { views: 500 }));
  const stale = optimizationScore(
    page([{ title: "A", clicks: 50 }, { title: "B", clicks: 0, over: { expired: true } }], {
      views: 500,
    }),
  );

  const before = clean.checks.find((check) => check.id === "hygiene");
  const after = stale.checks.find((check) => check.id === "hygiene");
  assert.equal(before?.earned, 10);
  assert.equal(after?.earned, 6);
  assert.match(after?.detail ?? "", /passed their end date|has passed its end date|has/);
});

test("the score is the arithmetic on the checks and nothing else", () => {
  const score = optimizationScore(
    page(
      [
        { title: "YouTube", clicks: 300 },
        { title: "Instagram", clicks: 120 },
        { title: "Shop", clicks: 60 },
      ],
      { views: 1200 },
    ),
  );

  const earned = score.checks.reduce((sum, check) => sum + check.earned, 0);
  const weight = score.checks.reduce((sum, check) => sum + check.weight, 0);
  assert.equal(score.value, Math.round((earned / weight) * 100));
});
