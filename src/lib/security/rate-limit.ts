import "server-only";

/**
 * A brake, in memory, per instance.
 *
 * Honest about what it is: a `Map` in one process. It resets on deploy and does
 * not coordinate across instances, so it is worth nothing against a distributed
 * attacker. What it does buy is real anyway — a loop from one address against a
 * Server Action costs database work whether or not the credentials are
 * plausible, and this stops that loop cheaply and without a dependency.
 *
 * Supabase rate-limits authentication itself, and that is the limit that
 * matters. When LOCK needs a shared one, it belongs in Postgres or a KV store
 * behind this same interface.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Bounded so a stream of distinct keys cannot grow this without limit. */
const MAX_KEYS = 5_000;

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      for (const [candidate, window] of windows) {
        if (window.resetAt <= now) windows.delete(candidate);
      }
      // Still full: every window is live, which means this instance is under
      // something unusual. Refuse rather than grow.
      if (windows.size >= MAX_KEYS) return false;
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/**
 * A key for the caller, from headers a proxy sets.
 *
 * `x-forwarded-for` is client-controllable when nothing trustworthy sits in
 * front of the app, which is exactly why this is described above as a brake
 * rather than a defence. On Vercel the leftmost entry is the real client and
 * the header cannot be forged.
 */
export function requestKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || headers.get("x-real-ip") || "unknown";
  return `${scope}:${address}`;
}
