import "server-only";

/**
 * A small brake on every public surface that costs something to serve.
 *
 * Four callers, and they are the four places an anonymous request does work:
 * `/api/track/view` and `/go/<id>` each write a row, `/api/username` runs a
 * query on every keystroke somebody types, and the auth actions run a query
 * before Supabase's own limiter sees the attempt. Without something in front
 * of them, a loop with `curl` inflates a creator's numbers, enumerates
 * usernames, or simply costs money.
 *
 * This is a fixed-window counter held in memory. That choice deserves its
 * limitations stated plainly rather than buried, because it is the weakest
 * part of the security story:
 *
 *   · It is per instance. A serverless deployment running four instances
 *     allows four times the stated rate, and a deploy resets every window.
 *
 *   · It therefore stops accidents and casual abuse — a refresh held down, a
 *     script someone wrote in a minute — and does not stop a distributed
 *     attempt. Nothing without shared state can.
 *
 * The alternative is a Redis dependency: a service to run, pay for and page
 * someone about. That trade is not worth making at this size. When ShowMe has
 * traffic worth forging, this becomes a call to a shared store and nothing
 * else in the codebase changes — which is why the interface takes a key and
 * returns a boolean and nothing else.
 *
 * It is also not the only protection on any of those surfaces, and on the ones
 * that matter it is not the main one. Supabase rate-limits authentication
 * itself; a forged analytics event can only ever be attributed to a profile
 * that exists and a link that is live, carries no attacker-chosen fields, and
 * lands in a table unreadable to everyone but its owner.
 *
 * It moved here from `lib/analytics/` in Phase 8, when it stopped being an
 * analytics concern.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Bounded so a stream of unique keys cannot grow the map without limit. */
const MAX_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  // Still too many after sweeping: something is generating unique keys faster
  // than they expire. Dropping the map is the right answer — it means the next
  // window starts fresh for everyone, which is a brief loss of enforcement
  // rather than unbounded memory in a process that has to keep serving pages.
  if (windows.size > MAX_KEYS) windows.clear();
}

/**
 * Whether this key may act again, and a note that it just did.
 *
 * Fixed windows are the crude version — somebody can spend a full allowance at
 * the end of one window and another at the start of the next. Given what this
 * protects, that is acceptable; a sliding window would double the state for a
 * factor-of-two improvement on a limit that is already generous.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Amortised cleanup: no timer to leak, and no work at all on a quiet site.
  if (windows.size > 64) sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}

/**
 * Who is asking, as far as we can tell, for rate-limiting only.
 *
 * The address is read here and used as a map key. It is never stored, never
 * logged, and never reaches the database — the event rows carry a daily salted
 * hash or nothing at all. When no address header is present the key falls back
 * to a constant, which means an unidentifiable caller shares one allowance
 * with every other unidentifiable caller. That is deliberately strict: it is
 * exactly the population that has something to hide.
 */
export function requestKey(headers: Headers, scope: string): string {
  const forwarded =
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0];

  return `${scope}:${forwarded?.trim() || "anonymous"}`;
}
