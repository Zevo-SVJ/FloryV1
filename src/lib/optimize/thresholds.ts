import type { Confidence } from "@/lib/optimize/types";

/**
 * How much data is enough, and how sure that makes us.
 *
 * These numbers are the difference between a feature that helps and one that
 * makes things up. A page with nine views and two clicks contains no
 * information about which link people prefer, and any product that ranks links
 * from it is telling the creator a story about noise.
 *
 * They are stated here, once, and every rule reads them rather than choosing
 * its own. They are also written into the interface: the optimization page
 * says which floor a page has not reached and how far off it is, so "not
 * enough data yet" is a fact a creator can watch change rather than a shrug.
 *
 * ── Why these numbers ───────────────────────────────────────────────────────
 *
 * They are chosen to be the point at which a difference large enough to act on
 * is unlikely to be noise, not to be the smallest number that produces output.
 *
 *   MIN_VIEWS 100      Any claim about where visitors come from or what they
 *                      browse on. At a hundred views a share of 70% has a
 *                      margin of roughly ±9 points — wide, but wide around a
 *                      claim ("most of your traffic is mobile") that only ever
 *                      needs to be directionally right.
 *
 *   MIN_CLICKS 40      Any claim about how clicks are distributed between
 *                      links. Ranking is harder than a share: it needs the gap
 *                      between two links to survive its own error bars, and
 *                      forty clicks across a handful of links is about where a
 *                      2× difference stops being a coin flip.
 *
 *   MIN_LINK_CLICKS 10 Any claim about one particular link. Below ten clicks a
 *                      link's share moves by ten points on a single visitor,
 *                      and "your #6 link is your best" would change its mind
 *                      every afternoon.
 *
 *   MIN_LINKS 3        Any comparison between links. With two you have an
 *                      ordering and no evidence that it means anything.
 *
 *   MIN_DEVICE_VIEWS 60  Per device, for a per-device click-through rate. Two
 *                      rates are being compared rather than one measured, so
 *                      both sides need their own sample.
 *
 *   STALE_DAYS 30      How long a link must have been on the page, with the
 *                      page receiving traffic, before silence means anything.
 *
 * ── Confidence ──────────────────────────────────────────────────────────────
 *
 * Below the floor, a rule returns nothing at all. Above it, confidence is a
 * function of how far above: three times the floor is where a claim stops
 * being provisional, ten times is where it is simply true of this page. A rule
 * never asserts its own confidence, which is what stops "high confidence" from
 * meaning "this rule's author was confident".
 */

/** Views before anything about traffic composition may be said. */
export const MIN_VIEWS = 100;

/** Clicks on the page before its click distribution may be interpreted. */
export const MIN_CLICKS = 40;

/** Clicks on one link before a claim may be made about that link. */
export const MIN_LINK_CLICKS = 10;

/** Live links before one may be compared against the others. */
export const MIN_LINKS = 3;

/** Views on one device before that device gets its own click-through rate. */
export const MIN_DEVICE_VIEWS = 60;

/** Days a link must have been live before its silence is worth mentioning. */
export const STALE_DAYS = 30;

/**
 * Views in both windows before a change between them is called a trend.
 *
 * Higher than `MIN_VIEWS` because a comparison has two samples and therefore
 * two chances to be noise, and because the number it produces — "up 34%" — is
 * read as far more precise than it is.
 */
export const MIN_TREND_VIEWS = 150;

/**
 * Sample size to confidence.
 *
 * Returns null below the floor, which is a rule's signal to return nothing.
 */
export function confidenceFor(sample: number, floor: number): Confidence | null {
  if (sample < floor) return null;
  if (sample < floor * 3) return "early";
  if (sample < floor * 10) return "medium";
  return "high";
}

/** The weaker of two confidences, for a claim that rests on both. */
export function weakest(a: Confidence, b: Confidence): Confidence {
  const rank = { early: 0, medium: 1, high: 2 } as const;
  return rank[a] <= rank[b] ? a : b;
}
