import { serverEnv } from "@/lib/server/env";

/**
 * A fixed-window limiter, in memory.
 *
 * Honest about its scope: this protects one server process from one impatient
 * visitor, which is what a single-region deployment needs. It is not a
 * distributed limiter, and the moment Blink runs on more than one instance this
 * should be swapped for a shared store. The interface is the same either way,
 * so only this file changes.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Keeps the map from growing without bound on a long-lived process. */
function sweep(now: number) {
  if (windows.size < 512) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface Verdict {
  ok: boolean;
  remaining: number;
  /** Seconds until the window rolls over. */
  retryAfter: number;
}

export function take(key: string): Verdict {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  const window =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + serverEnv.rateWindowMs };

  window.count += 1;
  windows.set(key, window);

  const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  return {
    ok: window.count <= serverEnv.rateLimit,
    remaining: Math.max(0, serverEnv.rateLimit - window.count),
    retryAfter,
  };
}

/**
 * Who is asking.
 *
 * A signed-in user is limited as themselves so they keep their allowance on a
 * shared network; everyone else is limited by the address the proxy reports.
 */
export function callerKey(request: Request, uid: string | null): string {
  if (uid) return `uid:${uid}`;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}
