import assert from "node:assert/strict";
import { test } from "node:test";

import {
  highPerformingLowPosition,
  linkOrderOpportunity,
  staleLink,
  topLinkNotFeatured,
  underperformingLink,
} from "../rules/links.ts";
import { deviceCtrGap, sourceConcentration, trafficTrend } from "../rules/audience.ts";
import { profileIncomplete } from "../rules/page.ts";
import { device, metrics, page } from "./fixtures.ts";

/**
 * Every rule, and — more importantly — every case in which it must say
 * nothing.
 *
 * The failure mode this whole feature is written against is confident output
 * from thin data, so roughly half of what follows asserts silence. A rule that
 * fires on seventeen clicks is worse than no rule at all: it teaches a creator
 * to act on noise, and then to stop trusting the section when the advice
 * contradicts itself next week.
 */

/* ── A link that outperforms where it sits ────────────────────────────────── */

test("a link far down the page taking most of the clicks is surfaced", () => {
  // Part 40's scenario: #6 with 900 clicks, everything above it much quieter.
  const found = highPerformingLowPosition.run(
    page([
      { title: "Website", clicks: 40 },
      { title: "Instagram", clicks: 60 },
      { title: "Shop", clicks: 30 },
      { title: "Newsletter", clicks: 20 },
      { title: "Podcast", clicks: 10 },
      { title: "YouTube", clicks: 900 },
    ]),
  );

  assert.equal(found.length, 1);
  const first = found[0];
  assert.ok(first);
  assert.equal(first.type, "HIGH_PERFORMING_LOW_POSITION");
  assert.match(first.title, /YouTube/);
  assert.equal(first.priority, "high");
  assert.equal(first.confidence, "high");
  assert.equal(first.action?.kind, "move_link_to_top");
  assert.match(first.explanation, /84\.9%/);
  // The reasoning is on the card, not in a footnote somewhere.
  assert.ok(first.evidence.some((item) => item.value === "#6"));
});

test("a link at #2 with eight times the clicks of #1 is still an opportunity", () => {
  // The rule once required position 3 or lower, which silently ignored the
  // clearest case there is.
  const found = highPerformingLowPosition.run(
    page([
      { title: "Link A", clicks: 100 },
      { title: "Link B", clicks: 800 },
      { title: "Link C", clicks: 50 },
    ]),
  );

  assert.equal(found.length, 1);
  assert.match(found[0]?.title ?? "", /Link B/);
});

test("a link already at the top is left alone", () => {
  const found = highPerformingLowPosition.run(
    page([
      { title: "YouTube", clicks: 900 },
      { title: "Instagram", clicks: 60 },
      { title: "Shop", clicks: 30 },
    ]),
  );
  assert.deepEqual(found, []);
});

test("a page with too few clicks produces nothing, however lopsided it looks", () => {
  // 39 clicks: one below the floor. The shape is identical to the case above.
  const found = highPerformingLowPosition.run(
    page([
      { title: "Website", clicks: 3 },
      { title: "Instagram", clicks: 2 },
      { title: "YouTube", clicks: 34 },
    ]),
  );
  assert.deepEqual(found, []);
});

test("a page with too few links produces nothing", () => {
  const found = highPerformingLowPosition.run(
    page([
      { title: "Website", clicks: 10 },
      { title: "YouTube", clicks: 90 },
    ]),
  );
  assert.deepEqual(found, []);
});

test("a narrow lead over the link above it is not an opportunity", () => {
  const found = highPerformingLowPosition.run(
    page([
      { title: "Website", clicks: 100 },
      { title: "Instagram", clicks: 40 },
      { title: "YouTube", clicks: 130 },
    ]),
  );
  assert.deepEqual(found, []);
});

/* ── Featuring ────────────────────────────────────────────────────────────── */

test("a clear favourite that is not featured is worth featuring", () => {
  const found = topLinkNotFeatured.run(
    page([
      { title: "YouTube", clicks: 400 },
      { title: "Instagram", clicks: 80 },
      { title: "Shop", clicks: 40 },
    ]),
  );

  assert.equal(found.length, 1);
  assert.equal(found[0]?.action?.kind, "feature_link");
  assert.match(found[0]?.title ?? "", /Feature YouTube/);
});

test("a link that is already featured is not recommended again", () => {
  const found = topLinkNotFeatured.run(
    page([
      { title: "YouTube", clicks: 400, over: { isFeatured: true } },
      { title: "Instagram", clicks: 80 },
      { title: "Shop", clicks: 40 },
    ]),
  );
  assert.deepEqual(found, []);
});

test("two links neck and neck produce no favourite to feature", () => {
  const found = topLinkNotFeatured.run(
    page([
      { title: "YouTube", clicks: 200 },
      { title: "Instagram", clicks: 190 },
      { title: "Shop", clicks: 40 },
    ]),
  );
  assert.deepEqual(found, []);
});

/* ── Underperforming ──────────────────────────────────────────────────────── */

test("a prominent link almost nobody uses is raised, without suggesting deletion", () => {
  const found = underperformingLink.run(
    page([
      { title: "Old landing page", clicks: 4 },
      { title: "Instagram", clicks: 90 },
      { title: "YouTube", clicks: 300 },
    ]),
  );

  assert.equal(found.length, 1);
  const first = found[0];
  assert.ok(first);
  assert.match(first.title, /Old landing page/);
  // Review first; hiding is available and reversible, deletion is not offered.
  assert.equal(first.action?.kind, "link");
  assert.equal(first.secondary?.[0]?.kind, "hide_link");
  assert.ok(!JSON.stringify(first).toLowerCase().includes("delete"));
});

test("a link added part-way through the window is never called underperforming", () => {
  const found = underperformingLink.run(
    page([
      { title: "Brand new link", clicks: 2, over: { ageDays: 3 } },
      { title: "Instagram", clicks: 90 },
      { title: "YouTube", clicks: 300 },
    ]),
  );
  assert.deepEqual(found, []);
});

test("a quiet link low down the page is not a problem", () => {
  const found = underperformingLink.run(
    page([
      { title: "YouTube", clicks: 300 },
      { title: "Instagram", clicks: 90 },
      { title: "Shop", clicks: 60 },
      { title: "An old link", clicks: 1 },
    ]),
  );
  assert.deepEqual(found, []);
});

/* ── Ordering ─────────────────────────────────────────────────────────────── */

test("an order that disagrees with the clicks is offered, with every move named", () => {
  const found = linkOrderOpportunity.run(
    page([
      { title: "Website", clicks: 20 },
      { title: "Instagram", clicks: 120 },
      { title: "YouTube", clicks: 400 },
      { title: "Shop", clicks: 60 },
    ]),
  );

  assert.equal(found.length, 1);
  const action = found[0]?.action;
  assert.ok(action && action.kind === "reorder_links");
  assert.deepEqual(
    action.changes,
    ["YouTube: #3 → #1", "Instagram: #2 → #2", "Shop: #4 → #3", "Website: #1 → #4"].filter(
      (line) => !line.includes("#2 → #2"),
    ),
  );
  // The confirmation names the number of links, and the changes are shown.
  assert.match(action.confirm, /Reorder 3 links\?/);
});

test("an order that already matches the clicks produces nothing", () => {
  const found = linkOrderOpportunity.run(
    page([
      { title: "YouTube", clicks: 400 },
      { title: "Instagram", clicks: 120 },
      { title: "Shop", clicks: 60 },
      { title: "Website", clicks: 20 },
    ]),
  );
  assert.deepEqual(found, []);
});

test("links with equal clicks keep the order the creator chose", () => {
  // Only YouTube has a reason to move. One link moving is the other rule's
  // job, so this one stays quiet rather than shuffling the ties around it.
  const found = linkOrderOpportunity.run(
    page([
      { title: "A", clicks: 0 },
      { title: "B", clicks: 0 },
      { title: "C", clicks: 0 },
      { title: "YouTube", clicks: 60 },
    ]),
  );
  const action = found[0]?.action;
  assert.ok(action && action.kind === "reorder_links");
  assert.deepEqual(action.order.slice(1).map((id) => id), action.order.slice(1));
  assert.deepEqual(action.changes, ["YouTube: #4 → #1", "A: #1 → #2", "B: #2 → #3", "C: #3 → #4"]);
});

/* ── Stale ────────────────────────────────────────────────────────────────── */

test("an expired link still on the page is reported as a fact, not an inference", () => {
  const found = staleLink.run(
    page([{ title: "Summer sale", clicks: 0, over: { expired: true } }, { title: "YouTube", clicks: 100 }]),
  );

  const expired = found.find((item) => item.key === "STALE_LINK:expired");
  assert.ok(expired);
  assert.equal(expired.confidence, "high");
  assert.match(expired.explanation, /no longer see it/);
});

test("a silent link is only mentioned once the page itself has traffic", () => {
  const quiet = staleLink.run(
    page([{ title: "Old link", clicks: 0 }, { title: "YouTube", clicks: 5 }], { views: 20 }),
  );
  assert.deepEqual(quiet, []);

  const busy = staleLink.run(
    page([{ title: "Old link", clicks: 0 }, { title: "YouTube", clicks: 200 }], { views: 900 }),
  );
  assert.equal(busy.length, 1);
  assert.match(busy[0]?.explanation ?? "", /not necessarily a bad one/);
});

test("a link that has not been up a month is not called stale", () => {
  const found = staleLink.run(
    page([{ title: "New link", clicks: 0, over: { ageDays: 5 } }, { title: "YouTube", clicks: 200 }], {
      views: 900,
    }),
  );
  assert.deepEqual(found, []);
});

/* ── The audience ─────────────────────────────────────────────────────────── */

test("a device gap is reported only when both sides have their own sample", () => {
  const thin = deviceCtrGap.run(
    metrics({
      views: 200,
      devices: [
        device({ device: "mobile", label: "Mobile", views: 180, clicks: 18, ctr: 10 }),
        device({ device: "desktop", label: "Desktop", views: 20, clicks: 10, ctr: null }),
      ],
    }),
  );
  assert.deepEqual(thin, []);

  const real = deviceCtrGap.run(
    metrics({
      views: 900,
      devices: [
        device({ device: "mobile", label: "Mobile", views: 800, clicks: 96, ctr: 12 }),
        device({ device: "desktop", label: "Desktop", views: 100, clicks: 30, ctr: 30 }),
      ],
    }),
  );
  assert.equal(real.length, 1);
  assert.match(real[0]?.explanation ?? "", /12% of those visits produced a click, against 30%/);
});

test("a third device with no clicks does not become the subject of the comparison", () => {
  // A tablet with eighty views and nothing to show for them is always the
  // extreme. Comparing extremes made it the subject of every comparison, and
  // the rule then failed its own "is this the device that matters" test — so
  // it never fired on a real page.
  const found = deviceCtrGap.run(
    metrics({
      views: 5400,
      devices: [
        device({ device: "mobile", label: "Mobile", views: 4584, clicks: 846, ctr: 18.5 }),
        device({ device: "desktop", label: "Desktop", views: 798, clicks: 270, ctr: 33.8 }),
        device({ device: "tablet", label: "Tablet", views: 89, clicks: 0, ctr: 0 }),
      ],
    }),
  );

  assert.equal(found.length, 1);
  assert.match(found[0]?.title ?? "", /^Mobile visitors click less often/);
  assert.match(found[0]?.explanation ?? "", /18\.5% of those visits produced a click, against 33\.8%/);
});

test("no device claim is made when the busier device is the one that converts better", () => {
  const found = deviceCtrGap.run(
    metrics({
      views: 900,
      devices: [
        device({ device: "mobile", label: "Mobile", views: 800, clicks: 240, ctr: 30 }),
        device({ device: "desktop", label: "Desktop", views: 100, clicks: 12, ctr: 12 }),
      ],
    }),
  );
  assert.deepEqual(found, []);
});

test("a dominant source is reported, and an absent referrer is not called a source", () => {
  const named = sourceConcentration.run(
    metrics({
      views: 1000,
      sources: [
        { key: "instagram", label: "Instagram", views: 700, share: 70 },
        { key: "direct", label: "Direct", views: 300, share: 30 },
      ],
    }),
  );
  assert.match(named[0]?.title ?? "", /Instagram sends most/);

  const unattributed = sourceConcentration.run(
    metrics({
      views: 1000,
      sources: [{ key: "direct", label: "Direct", views: 900, share: 90 }],
    }),
  );
  assert.match(unattributed[0]?.title ?? "", /without a referrer/);
  assert.match(unattributed[0]?.explanation ?? "", /missing information rather than a channel/);
});

test("a trend needs both windows to be large, and a change worth mentioning", () => {
  const noise = trafficTrend.run(metrics({ views: 60, previous: { views: 40, clicks: 10 } }));
  assert.deepEqual(noise, []);

  const small = trafficTrend.run(metrics({ views: 210, previous: { views: 200, clicks: 40 } }));
  assert.deepEqual(small, []);

  const real = trafficTrend.run(
    metrics({ views: 400, clicks: 100, previous: { views: 200, clicks: 40 } }),
  );
  assert.equal(real.length, 1);
  assert.match(real[0]?.explanation ?? "", /up 100%/);
  // No forecast, ever.
  assert.ok(!/will|expect|predict/i.test(real[0]?.explanation ?? ""));
});

/* ── The page itself ──────────────────────────────────────────────────────── */

test("a missing bio is reported without a number attached to it", () => {
  const found = profileIncomplete.run(
    metrics({ profile: { hasAvatar: true, hasDisplayName: true, hasBio: false, socialCount: 2 } }),
  );

  assert.equal(found.length, 1);
  const first = found[0];
  assert.ok(first);
  assert.equal(first.confidence, "high");
  assert.equal(first.priority, "medium");
  // No invented uplift.
  assert.ok(!/%/.test(first.explanation));
});

test("a complete profile produces nothing", () => {
  const found = profileIncomplete.run(metrics());
  assert.deepEqual(found, []);
});

test("a page with no name and no photo is the higher priority", () => {
  const found = profileIncomplete.run(
    metrics({ profile: { hasAvatar: false, hasDisplayName: false, hasBio: false, socialCount: 0 } }),
  );
  assert.equal(found[0]?.priority, "high");
  assert.match(found[0]?.title ?? "", /Finish your profile/);
});

/* ── Links a visitor cannot see ───────────────────────────────────────────── */

test("a scheduled or expired link has no position and is not ranked against ones that do", () => {
  // "Gone" has the most clicks in the window and is invisible. It must not be
  // recommended for promotion, and it must not count towards the three links
  // needed for a comparison.
  const source = page([
    { title: "Website", clicks: 30 },
    { title: "Gone", clicks: 900, over: { expired: true, position: 0, visible: false } },
    { title: "Instagram", clicks: 20 },
  ]);

  assert.deepEqual(highPerformingLowPosition.run(source), []);
  assert.deepEqual(topLinkNotFeatured.run(source), []);
  assert.deepEqual(linkOrderOpportunity.run(source), []);

  // The rule whose subject is exactly that link still speaks.
  const stale = staleLink.run(source);
  assert.equal(stale.length, 1);
  assert.match(stale[0]?.title ?? "", /Gone has expired/);
});

test("no two links on the page are ever given the same number", () => {
  const source = page([
    { title: "One", clicks: 50 },
    { title: "Later", clicks: 0, over: { scheduled: true, position: 0, visible: false } },
    { title: "Two", clicks: 40 },
    { title: "Three", clicks: 30 },
  ]);

  const numbered = source.links.filter((item) => item.visible).map((item) => item.position);
  assert.equal(new Set(numbered).size, numbered.length);
});
