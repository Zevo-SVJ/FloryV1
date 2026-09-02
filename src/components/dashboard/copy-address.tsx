"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copy the page address.
 *
 * The single thing a creator wants from this screen: the link, on the
 * clipboard, ready to paste into a bio. The confirmation clears itself so the
 * button never sits in a state that no longer means anything.
 */
export function CopyAddress({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          // Denied permission, or an insecure origin. The address is on screen
          // and selectable, so there is nothing useful to say here.
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </Button>
  );
}
