import "server-only";

/**
 * A small brake on the two public endpoints.
 *
 * Both `/api/track/view` and `/go/<id>` are reachable by anybody, and both
 * write a row. Without something in front of them, a loop with `curl` inflates
 * a creator's numbers or fills a table.
 *
 * This is a fixed-window counter held in memory. That choice deserves its
 * limitations stated plainly rather than buried, because it is the weakest
 * part of this phase:
 *
 *   · It is per instance. A serverless deployment running four instances
 *     allows four times the stated rate, and a deploy resets every window.
 *
 *   · It therefore stops accidents and casual abuse — a refresh held down, a
 *     script someone wrote in a minute — and does not stop a distributed
 *     attempt. Nothing without shared state can.
 *
 * The alternative is a Redis dependency, which is a service to run, pay for
 * and page someone about, in front of a feature whose failure mode is a number
 * being wrong. That trade is not worth making yet. When ShowMe has traffic
 * worth forging, this becomes a call to a shared store and nothing else in the
 * codebase changes — which is why the interface takes a key and returns a
 * boolean and nothing else.
 *
 * The real protection is elsewhere and is structural: a forged event can only
 * ever be attributed to a profile that exists and a link that is active, it
 * carries no attacker-chosen fields, and the tables are unreadable to everyone
 * but their owner.
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
