/**
 * The windows a creator can look at, and what a comparison means.
 *
 * Five ranges, each with a bucket size chosen so a chart has enough columns to
 * show a shape and few enough to stay readable on a phone. Today is hourly;
 * everything else is daily.
 *
 * Every range is half-open — `from` inclusive, `to` exclusive — so an event at
 * a boundary is counted once and by one range. Getting that wrong is how a
 * dashboard shows a total that does not equal the sum of its days.
 */

export const RANGES = ["today", "7d", "30d", "90d", "all"] as const;
export type RangeId = (typeof RANGES)[number];

export const DEFAULT_RANGE: RangeId = "7d";

export const RANGE_LABELS: Record<RangeId, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All time",
};

export const isRangeId = (value: string | undefined): value is RangeId =>
  value !== undefined && (RANGES as readonly string[]).includes(value);

export interface Window {
  from: Date;
  to: Date;
  bucket: "hour" | "day";
  /**
   * The window immediately before this one, of the same length.
   *
   * Null for "all time", which has nothing before it, and for a window that
   * reaches back further than the account does — comparing against a period a
   * creator did not exist for would report an infinite rise.
   */
  previous: { from: Date; to: Date } | null;
}

const DAY_MS = 86_400_000;

/**
 * Turn a range id into two instants, plus the period to compare against.
 *
 * `now` is a parameter so this is pure and testable. `since` is the account's
 * creation time and is what stops the comparison from being nonsense: a
 * three-day-old account asking for 30 days has no previous 30 days, and
 * "+1,200%" against a period of non-existence is a fabricated number.
 */
export function resolveWindow(range: RangeId, now: Date, since: Date | null): Window {
  const to = new Date(now.getTime());

  if (range === "all") {
    // Far enough back to precede any account. The query is still bounded, so
    // the planner keeps using the (profile_id, created_at) index.
    return { from: new Date(0), to, bucket: "day", previous: null };
  }

  if (range === "today") {
    const from = new Date(now.getTime());
    from.setHours(0, 0, 0, 0);
    const length = to.getTime() - from.getTime();
    return {
      from,
      to,
      bucket: "hour",
      previous: comparable(new Date(from.getTime() - length), from, since),
    };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const from = new Date(to.getTime() - days * DAY_MS);

  return {
    from,
    to,
    bucket: "day",
    previous: comparable(new Date(from.getTime() - days * DAY_MS), from, since),
  };
}

/**
 * A previous period, or null when there is not enough history to have one.
 *
 * The rule is that the comparison window must lie entirely inside the
 * account's lifetime. Anything else produces a percentage that describes our
 * arithmetic rather than the creator's page.
 */
function comparable(from: Date, to: Date, since: Date | null): { from: Date; to: Date } | null {
  if (!since) return null;
  return from.getTime() >= since.getTime() ? { from, to } : null;
}

/**
 * The change between two numbers, or null when the change means nothing.
 *
 * Null in three cases, and each of them is a percentage somebody would
 * otherwise have believed:
 *
 *   · there is no previous period to compare against;
 *   · the previous period is zero, where any increase is "infinity" and any
 *     honest rendering is "no comparison";
 *   · both are zero, where nothing happened either time.
 *
 * The dashboard renders null as "Not enough data" rather than as 0%.
 */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Clicks divided by views, as a percentage.
 *
 * One definition, used everywhere the word CTR appears. Null when there were
 * no views: a page nobody saw has no rate, and rendering 0% would say that
 * nobody clicked when in fact nobody was asked.
 *
 * It can exceed 100%. One visitor following three links is three clicks on one
 * view, and that is a real thing a page does rather than an error to clamp —
 * the dashboard says so where the number is defined.
 */
export function clickThroughRate(clicks: number, views: number): number | null {
  if (views === 0) return null;
  return Math.round((clicks / views) * 1000) / 10;
}
