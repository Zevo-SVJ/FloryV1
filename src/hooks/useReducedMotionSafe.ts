"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the viewer has asked for less motion, read in a way that survives
 * hydration.
 *
 * This matters here because scenes render a *different beat* when motion is
 * reduced — a client-only read on the first render would be a genuine
 * hydration mismatch, not a cosmetic one. `useSyncExternalStore` gives the
 * server's answer during hydration and the real one immediately after.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

let query: MediaQueryList | null = null;

function getQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  query ??= window.matchMedia(QUERY);
  return query;
}

function subscribe(onChange: () => void): () => void {
  const media = getQuery();
  if (!media) return () => {};
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return getQuery()?.matches ?? false;
}

/** The server cannot know the preference, so it assumes full motion. */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
