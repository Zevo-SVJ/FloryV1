"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { SharePreview } from "@/components/share/share-sheet";

/**
 * The button that opens the share sheet.
 *
 * Deliberately the only thing that ships eagerly. The sheet carries a dialog,
 * a platform list and — behind a second tap — a QR encoder and a canvas, and
 * none of it is needed until somebody presses this. `next/dynamic` splits it
 * into a chunk fetched on the press, which on a dashboard opened to check a
 * number is the difference between paying for the feature and paying for the
 * button.
 *
 * The sheet is unmounted on close rather than hidden. It holds a `<dialog>`
 * whose open state the browser owns, and keeping a closed one mounted means
 * two sources of truth about whether it is showing.
 */

const ShareSheet = dynamic(
  () => import("@/components/share/share-sheet").then((m) => m.ShareSheet),
  { ssr: false },
);

export function ShareButton({
  url,
  address,
  profile,
}: {
  url: string;
  address: string;
  profile: SharePreview;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink shadow-control transition-colors hover:bg-accent-hover"
      >
        Share
      </button>

      {open ? (
        <ShareSheet
          url={url}
          address={address}
          profile={profile}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
