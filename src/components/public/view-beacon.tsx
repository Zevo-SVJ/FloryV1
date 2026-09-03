"use client";

import { useEffect } from "react";

/**
 * The only thing on a creator page that reports anything.
 *
 * A few hundred bytes, one request, no cookie, no identifier, no library. It
 * sends a username and the browser's own `document.referrer`; everything else
 * an event records is derived on the server from headers the request was
 * always going to carry.
 *
 * It exists because the page is cached. A view counted during the render would
 * count the first visitor after each revalidation and nobody else, which is
 * not a statistic — it is a measurement of the cache.
 *
 * `sendBeacon` where it exists: the browser takes ownership of the request and
 * will deliver it even if the page is closed a moment later, which is the
 * common case for somebody who taps a link straight through. `fetch` with
 * `keepalive` is the same guarantee under a different name for anything that
 * lacks it.
 *
 * Every failure is swallowed. A blocked request, an offline visitor, a
 * `sendBeacon` that returns false — none of it is worth a console message on
 * somebody else's page, and none of it changes what the visitor sees.
 */
export function ViewBeacon({ username }: { username: string }) {
  useEffect(() => {
    /*
     * `sessionStorage`, not a cookie. It is per tab, cleared when the tab
     * closes, never sent to a server and unreadable from any other origin — so
     * it is not tracking in the sense that requires a banner. All it does is
     * stop React's development double-render, and a bounce back through the
     * history stack, from counting twice.
     */
    const key = `sm:v:${username}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode, or storage disabled. Carry on and accept the duplicate.
    }

    const payload = JSON.stringify({ u: username, r: document.referrer || undefined });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track/view", new Blob([payload], { type: "application/json" }));
        return;
      }

      void fetch("/api/track/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Nothing to do, and nothing that should reach the visitor.
    }
  }, [username]);

  return null;
}
