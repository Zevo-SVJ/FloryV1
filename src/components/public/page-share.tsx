"use client";

import { useEffect, useState } from "react";
import { canNativeShare, useBrowserValue } from "@/lib/hooks/use-browser-value";

/**
 * The one interactive thing in the page's footer.
 *
 * A visitor who wants to pass a creator's page on is the growth loop, so it is
 * worth one small button — and worth no more than that. This is the entire
 * client-side cost: no share sheet, no QR encoder, no platform list. The share
 * sheet with all of that in it lives behind the creator's own dashboard, where
 * shipping a few kilobytes to one signed-in person is free and shipping them
 * to every visitor would not be.
 *
 * Three behaviours, in order of what the device can actually do:
 *
 *   · `navigator.share` where it exists — which on a phone is the real system
 *     sheet with the apps the visitor actually uses, including the ones with
 *     no web share URL at all.
 *   · the clipboard, everywhere else.
 *   · nothing, if both are refused. The address is in the URL bar; there is
 *     no honest third fallback and inventing one would be a button that lies.
 *
 * Support is detected through `useBrowserValue`, not during render.
 * `navigator` does not exist on the server, and branching on it while
 * rendering would produce markup the client disagrees with — so the button
 * starts as the fallback, which is the behaviour that always works.
 */
export function PageShare({ url, title }: { url: string; title: string }) {
  const canShare = useBrowserValue(canNativeShare, false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    if (canShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /*
         * A cancelled sheet throws `AbortError`, which is indistinguishable
         * here from a real failure and is by far the more likely of the two.
         * Falling through to the clipboard would put something on it that the
         * visitor just decided not to send, so this stops.
         */
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Denied, or an insecure origin. The address is on screen either way.
    }
  }

  return (
    <button type="button" onClick={() => void share()} className="sm-footer-action">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-3.5 w-3.5"
      >
        <path d="M12 3v11M8.5 6.5 12 3l3.5 3.5M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
      </svg>
      <span aria-live="polite">{copied ? "Link copied" : canShare ? "Share" : "Copy link"}</span>
    </button>
  );
}
