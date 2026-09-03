"use client";

import { useSyncExternalStore } from "react";

/**
 * A fact about the browser, read without risking a hydration mismatch.
 *
 * Feature detection has to happen after mount. `typeof navigator.share ===
 * "function"` is false on the server and true on a phone, so branching on it
 * during render produces markup the client disagrees with — and React's answer
 * to a mismatch is to discard the server's work.
 *
 * `useSyncExternalStore`'s third argument exists for exactly this: a server
 * snapshot that is deliberately different from the client's. The subscription
 * is a no-op because none of these values change while the page is open — a
 * browser does not grow a share sheet mid-session — so this is a one-way read
 * that happens at the right moment, and not a `setState` in an effect that
 * costs a second render pass on every mount.
 */

/** Nothing to subscribe to: these facts are fixed for the page's lifetime. */
const noSubscription = (): (() => void) => () => {};

export function useBrowserValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noSubscription, read, () => fallback);
}

/** Whether this browser can open a native share sheet. */
export const canNativeShare = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";
