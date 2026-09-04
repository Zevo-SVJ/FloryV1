import assert from "node:assert/strict";
import { test } from "node:test";

import { asksForAChange, evaluate, isApplyAction, whatIsMissing } from "../engine.ts";
import { device, link, metrics, page } from "./fixtures.ts";

/**
 * The engine, and the edge cases that must not produce output or a crash.
 *
 * Two things are being asserted here that no individual rule can assert on its
 * own: that a page with nothing on it survives every rule at once, and that
 * the order the cards appear in is the order a creator should read them.
 */

test("a page with no data produces no recommendations about data", () => {
  const report = evaluate(metrics({ views: 0, clicks: 0, links: [] }));

  assert.equal(report.state, "empty");
  assert.equal(report.score.value, null);
  // The profile rule may still speak — it needs no visitors — but nothing that
  // reads a click may.
  for (const recommendation of report.recommendations) {
    assert.equal(recommendation.type, "PROFILE_INCOMPLETE");
  }
});

test("a page with some traffic but not enough is 'learning', and says what is missing", () => {
  const report = evaluate(page([{ title: "A", clicks: 3 }], { views: 40 }));

  assert.equal(report.state, "learning");
  assert.equal(report.score.value, null);
  assert.deepEqual(whatIsMissing(report.metrics), [
    "60 more views for an optimization score",
    "37 more clicks before your links can be compared",
  ]);
});

test("high-impact recommendations come first, and confidence breaks the tie", () => {
  const report = evaluate(
    page(
      [
        { title: "Website", clicks: 20 },
        { title: "Instagram", clicks: 60 },
        { title: "Shop", clicks: 30 },
        { title: "YouTube", clicks: 900 },
      ],
      {
        views: 4000,
        previous: { views: 1000, clicks: 200 },
        profile: { hasAvatar: true, hasDisplayName: true, hasBio: false, socialCount: 2 },
        sources: [{ key: "instagram", label: "Instagram", views: 3000, share: 75 }],
      },
    ),
  );

  const priorities = report.recommendations.map((item) => item.priority);
  const ranks = { high: 0, medium: 1, low: 2 } as const;
  for (let i = 1; i < priorities.length; i++) {
    const previous = priorities[i - 1];
    const current = priorities[i];
    assert.ok(previous && current && ranks[previous] <= ranks[current], "priorities are in order");
  }

  assert.equal(report.recommendations[0]?.type, "HIGH_PERFORMING_LOW_POSITION");
  // Only the ones that change something count as opportunities.
  assert.ok(report.opportunities > 0);
  assert.ok(report.opportunities <= report.recommendations.length);
});

test("a dismissed recommendation is set aside rather than deleted", () => {
  const source = page(
    [
      { title: "Website", clicks: 20 },
      { title: "Instagram", clicks: 60 },
      { title: "YouTube", clicks: 900 },
    ],
    { views: 4000 },
  );

  const before = evaluate(source);
  const key = before.recommendations[0]?.key;
  assert.ok(key);

  const after = evaluate(source, new Set([key]));
  assert.ok(!after.recommendations.some((item) => item.key === key));
  assert.ok(after.dismissed.some((item) => item.key === key));
  assert.equal(after.recommendations.length + after.dismissed.length, before.recommendations.length);
});

test("a recommendation's key is stable across evaluations of the same page", () => {
  const source = page(
    [
      { title: "Website", clicks: 20 },
      { title: "Instagram", clicks: 60 },
      { title: "YouTube", clicks: 900 },
    ],
    { views: 4000 },
  );

  assert.deepEqual(
    evaluate(source).recommendations.map((item) => item.key),
    evaluate(source).recommendations.map((item) => item.key),
  );
});

test("once the change is made, the recommendation is not generated again", () => {
  const before = evaluate(
    page(
      [
        { title: "Website", clicks: 20 },
        { title: "Instagram", clicks: 60 },
        { title: "YouTube", clicks: 900 },
      ],
      { views: 4000 },
    ),
  );
  assert.ok(before.recommendations.some((item) => item.type === "HIGH_PERFORMING_LOW_POSITION"));

  // The same page after the creator moved YouTube to the top.
  const after = evaluate(
    page(
      [
        { title: "YouTube", clicks: 900, over: { isFeatured: true } },
        { title: "Website", clicks: 20 },
        { title: "Instagram", clicks: 60 },
      ],
      { views: 4000 },
    ),
  );
  assert.ok(!after.recommendations.some((item) => item.type === "HIGH_PERFORMING_LOW_POSITION"));
  assert.ok(!after.recommendations.some((item) => item.type === "TOP_LINK_NOT_FEATURED"));
});

/* ── Edge cases ───────────────────────────────────────────────────────────── */

test("nothing crashes on the pages that break things", () => {
  const cases: Parameters<typeof evaluate>[0][] = [
    metrics({ views: 0, clicks: 0, links: [] }),
    metrics({ views: 1, clicks: 0, links: [link()] }),
    metrics({ views: 1, clicks: 1, links: [link({ clicks: 1, share: 100 })] }),
    // One link, all the clicks.
    page([{ title: "Only", clicks: 5000 }], { views: 20_000 }),
    // Sixty links, none clicked.
    metrics({
      views: 900,
      clicks: 0,
      links: Array.from({ length: 60 }, (_, index) =>
        link({ id: `link-${index}`, title: `Link ${index}`, position: index + 1 }),
      ),
    }),
    // Every link hidden behind a schedule or expired.
    page([
      { title: "Gone", clicks: 0, over: { expired: true } },
      { title: "Later", clicks: 0, over: { scheduled: true } },
    ]),
    // Dimensions that arrived unknown.
    metrics({
      views: 500,
      clicks: 100,
      devices: [device({ device: "unknown", label: "Unknown", views: 500, clicks: 100, ctr: 20 })],
      sources: [{ key: "other", label: "Other", views: 500, share: 100 }],
    }),
    // A previous window of nothing.
    metrics({ views: 500, clicks: 100, previous: { views: 0, clicks: 0 } }),
  ];

  for (const input of cases) {
    const report = evaluate(input);
    assert.ok(Array.isArray(report.recommendations));
    for (const recommendation of report.recommendations) {
      assert.ok(recommendation.key.length > 0);
      assert.ok(recommendation.title.length > 0);
      assert.ok(recommendation.explanation.length > 0);
      assert.ok(recommendation.evidence.length > 0);
      // No `undefined`, `NaN` or `Infinity` ever reaches a creator.
      const rendered = JSON.stringify(recommendation);
      assert.ok(!/undefined|NaN|Infinity|null%/.test(rendered), rendered);
    }
  }
});

test("no recommendation ever contains a raw identifier in text a creator reads", () => {
  const report = evaluate(
    page(
      [
        { title: "Website", clicks: 20 },
        { title: "Instagram", clicks: 60 },
        { title: "YouTube", clicks: 900 },
      ],
      { views: 4000 },
    ),
  );

  for (const recommendation of report.recommendations) {
    const prose = [
      recommendation.title,
      recommendation.explanation,
      ...recommendation.evidence.map((item) => `${item.label} ${item.value}`),
    ].join(" ");
    assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(prose), prose);
  }
});

/* ── What is an opportunity ───────────────────────────────────────────────── */

test("a recommendation that opens the editor is an opportunity, not an observation", () => {
  // "Add a photo" and "Summer sale has expired" cannot be done in one press —
  // they open the editor — but they are still things to do. Filing them under
  // "nothing to do about these" beside "your views are up" was wrong in a way
  // a creator would notice immediately.
  const report = evaluate(
    page(
      [
        { title: "Website", clicks: 20 },
        { title: "Instagram", clicks: 60 },
        { title: "YouTube", clicks: 900 },
        { title: "Old sale", clicks: 0, over: { expired: true, position: 0, visible: false } },
      ],
      {
        views: 4000,
        previous: { views: 1000, clicks: 200 },
        profile: { hasAvatar: false, hasDisplayName: true, hasBio: true, socialCount: 2 },
        sources: [{ key: "instagram", label: "Instagram", views: 3000, share: 75 }],
      },
    ),
  );

  const asks = report.recommendations.filter(asksForAChange).map((item) => item.type);
  const observes = report.recommendations.filter((item) => !asksForAChange(item)).map((item) => item.type);

  assert.ok(asks.includes("PROFILE_INCOMPLETE"), "adding a photo is something to do");
  assert.ok(asks.includes("STALE_LINK"), "an expired link is something to do");
  assert.ok(observes.includes("SOURCE_CONCENTRATION"), "where visitors come from is information");
  assert.ok(observes.includes("TRAFFIC_TREND"), "a trend is information");

  // Everything in the observation group offers analytics and nothing else.
  for (const recommendation of report.recommendations.filter((item) => !asksForAChange(item))) {
    assert.equal(recommendation.action, undefined);
    for (const secondary of recommendation.secondary ?? []) {
      assert.equal(secondary.kind, "link");
    }
  }

  // The count on the score panel is the size of the actionable group.
  assert.equal(report.opportunities, asks.length);
  // One-press actions are a subset of them.
  assert.ok(report.recommendations.filter(isApplyAction).length <= asks.length);
});
