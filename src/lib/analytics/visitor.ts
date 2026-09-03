import "server-only";

import { createHmac } from "node:crypto";

/**
 * Estimating unique visitors without identifying anybody.
 *
 * The problem: a creator wants to know whether forty views were forty people
 * or one person refreshing. The usual answers are a cookie or a fingerprint,
 * and ShowMe will do neither — a cookie on a creator's page is a consent
 * banner on a creator's page, and a fingerprint is worse than a cookie because
 * nobody can clear it.
 *
 * What this does instead is the approach Plausible and Fathom use, and it is
 * worth stating precisely because "hashed IP" is often said about schemes that
 * are not private at all:
 *
 *     hash = HMAC-SHA256(key = secret + today, message = ip + ua + profile)
 *
 * Four properties follow, and all four matter.
 *
 *   · The IP address is never stored, never logged, and never leaves the
 *     function it was read in. Only sixteen bytes of hash are written.
 *
 *   · The salt changes at midnight UTC, so yesterday's hash and today's hash
 *     for the same person do not match. Nobody — including us — can follow a
 *     visitor across days.
 *
 *   · The profile id is in the message, so the same person visiting two
 *     creators' pages produces two unrelated hashes. There is no cross-page
 *     identity to build a profile on.
 *
 *   · It is a keyed HMAC, not a bare hash. A plain SHA-256 of an IP address is
 *     reversible by anybody with an afternoon and the IPv4 space; without the
 *     secret, this is not.
 *
 * The cost is honesty about accuracy: two people behind one NAT count as one,
 * one person on wifi and then on mobile data counts as two, and a visit that
 * arrives without an address counts as a view but not as a visitor. That is
 * why the dashboard says "estimated" and never claims a count of humans.
 *
 * Without `ANALYTICS_SALT` this returns null and the feature turns itself off
 * rather than degrading. A per-process random salt would be worse than nothing
 * — every serverless instance would hold a different one, and the same visitor
 * would be counted once per instance, producing a number that looks precise
 * and is wrong.
 */

const SALT = process.env.ANALYTICS_SALT?.trim() || null;

/** Whether unique-visitor estimation is available in this deployment. */
export const canEstimateVisitors = (): boolean => SALT !== null;

/**
 * The headers a proxy uses to report the client address, most specific first.
 *
 * Read, hashed, and dropped. `x-forwarded-for` may be a chain; the first entry
 * is the client and everything after it is infrastructure.
 */
const ADDRESS_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-forwarded-for",
] as const;

function clientAddress(headers: Headers): string | null {
  for (const name of ADDRESS_HEADERS) {
    const value = headers.get(name);
    if (!value) continue;
    const first = value.split(",")[0]?.trim();
    if (first && first.length > 0 && first.length <= 45) return first;
  }
  return null;
}

/**
 * A hash for today, for this visitor, on this creator's page — or null.
 *
 * Null is a normal outcome and the caller treats it as one: the view is still
 * recorded, and only the visitor estimate declines to count it.
 */
export function visitorHash(headers: Headers, profileId: string): string | null {
  if (!SALT) return null;

  const address = clientAddress(headers);
  if (!address) return null;

  const day = new Date().toISOString().slice(0, 10);
  const userAgent = headers.get("user-agent") ?? "";

  return createHmac("sha256", `${SALT}:${day}`)
    .update(`${address}\n${userAgent}\n${profileId}`)
    .digest("hex")
    // Sixteen bytes. Enough that a collision inside one creator's day is
    // implausible, and short enough that the column is not carrying entropy it
    // has no use for.
    .slice(0, 32);
}
