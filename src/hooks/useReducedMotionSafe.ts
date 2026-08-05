"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the visitor has asked for less motion — read in a way that survives
 * hydration.
 *
 * This matters more here than in most products: the cinematics render a
 * *different beat* when motion is reduced, so a client-only read on the first
 * render would be a genuine hydration mismatch, not a cosmetic one.
 * `useSyncExternalStore` gives us the server's answer during hydration and the
 * real one immediately after, with no mismatch and no effect.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

let mediaQuery: MediaQueryList | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  mediaQuery ??= window.matchMedia(QUERY);
  return mediaQuery;
}

function subscribe(onChange: () => void): () => void {
  const query = getMediaQuery();
  if (!query) return () => {};

  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false;
}

/** The server cannot know the preference, so it assumes full motion. */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
