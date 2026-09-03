"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, in a component that is server-rendered first.
 *
 * `new Date()` inside a Client Component's render body is a hydration bug
 * waiting for the right millisecond: the server renders with its own clock,
 * the browser hydrates with the visitor's, and any text derived from the two
 * can disagree. React reports that as a mismatch and throws the server markup
 * away.
 *
 * A clock is an external system that changes on its own, which is exactly what
 * `useSyncExternalStore` is for — including its third argument, the server
 * snapshot, which is the sanctioned way to say "this value does not exist
 * until there is a browser". So the first render on both sides gets null, and
 * a caller renders whatever is true regardless of the time until then: for a
 * link, "hidden" or "on your page".
 *
 * It ticks because a creator who has just scheduled a link for two minutes'
 * time should watch the badge change rather than wonder whether the save
 * worked. Thirty seconds is well inside the minute a `datetime-local` field
 * can express.
 *
 * One interval for the whole page, not one per component. A creator with
 * twenty links would otherwise be running twenty timers to answer the same
 * question, and they would answer it at twenty slightly different moments.
 */

const TICK_MS = 30_000;

let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // The first subscriber starts the clock. Reading it here rather than in
  // `getSnapshot` keeps the snapshot pure, which the store contract requires.
  if (current === null) current = Date.now();

  timer ??= setInterval(() => {
    current = Date.now();
    for (const notify of listeners) notify();
  }, TICK_MS);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = (): number | null => current;
/** No clock on the server, and saying so is the whole point. */
const getServerSnapshot = (): number | null => null;

export function useNow(): Date | null {
  const at = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return at === null ? null : new Date(at);
}
