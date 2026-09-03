"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { canNativeShare, useBrowserValue } from "@/lib/hooks/use-browser-value";
import { shareActions } from "@/lib/share/targets";
import { cn } from "@/lib/utils/cn";

/**
 * Share your ShowMe.
 *
 * A `<dialog>`, opened with `showModal()`, because the platform already
 * implements everything an accessible modal needs and every hand-rolled
 * version gets one of them wrong: the focus trap, the inert background, the
 * Escape key, the backdrop, and returning focus to the button that opened it.
 * The only things left to add are the label association and closing on a
 * backdrop click.
 *
 * Two shapes, one component. A sheet from the bottom on a phone and a centred
 * card above `sm` — which is not decoration: a centred dialog on a 320px
 * screen puts its buttons under the thumb's own reach, and a bottom sheet is
 * where a share sheet belongs on a phone because that is where every native
 * one appears.
 *
 * ── What is in it, and what is not ──────────────────────────────────────────
 *
 * The preview shows the avatar, the display name and the address — which is
 * exactly the public page's own header, and nothing else. No view counts, no
 * click totals, no email: this is the one screen in the dashboard whose whole
 * purpose is to be shown to somebody else, often over a shoulder, and a
 * number from the analytics page has no business appearing on it.
 *
 * The QR panel is loaded on demand. It is the only part of this that carries
 * real weight — an encoder and a canvas — and a creator who wanted the link
 * on their clipboard should not download it.
 */

const QrPanel = dynamic(() => import("@/components/share/qr-panel").then((m) => m.QrPanel), {
  /*
   * No server render: it draws to a canvas and reads `navigator`. The
   * placeholder is the same height as the symbol, so opening the panel does
   * not make the dialog jump.
   */
  ssr: false,
  loading: () => (
    <div className="flex h-[12.5rem] items-center justify-center text-[0.8125rem] text-ink-subtle">
      Building the code…
    </div>
  ),
});

export interface SharePreview {
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
}

export function ShareSheet({
  url,
  address,
  profile,
  onClose,
}: {
  /** The absolute canonical URL — what gets copied, shared and encoded. */
  url: string;
  /** The same address without the scheme, for reading. */
  address: string;
  profile: SharePreview;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const canShare = useBrowserValue(canNativeShare, false);

  const name = profile.displayName ?? `@${profile.username}`;

  /*
   * `showModal` and not the `open` attribute. Only the former makes the
   * dialog modal: the focus trap, the inert background, the `::backdrop` and
   * the Escape key all come with it, and an `open` dialog has none of them.
   */
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2400);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(hint = "Copied") {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(hint);
    } catch {
      setCopied("Copying was blocked — select the address above instead.");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: name, url });
    } catch {
      // Cancelled, or refused. Nothing to say: the sheet is still open and
      // every other option is a tap away.
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="share-title"
      onClose={onClose}
      /*
       * A click on the backdrop lands on the dialog element itself, where a
       * click inside lands on a child — so comparing the target is the whole
       * check, and it needs no overlay element of its own.
       */
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current?.close();
      }}
      className={cn(
        "m-0 w-full max-w-none rounded-t-[18px] bg-canvas p-0 text-ink",
        "backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]",
        // Bottom sheet on a phone.
        "mt-auto mb-0",
        // Centred card from `sm` up.
        "sm:m-auto sm:max-w-[24rem] sm:rounded-card",
      )}
    >
      <div className="max-h-[85dvh] overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="share-title" className="text-[1.0625rem] font-semibold tracking-tight">
            Share your ShowMe
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
              className="h-4 w-4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* ── The preview ──────────────────────────────────────────────── */}

        <div className="mt-4 flex items-center gap-3 rounded-card bg-surface-sunken p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-border">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                width={88}
                height={88}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[0.9375rem] font-semibold text-ink-subtle">
                {name.replace("@", "").charAt(0).toUpperCase()}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium">{name}</span>
            <span className="block truncate font-mono text-[0.75rem] text-ink-subtle">
              {address}
            </span>
          </span>
        </div>

        {/* ── The two things most people want ──────────────────────────── */}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="h-10 flex-1 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink shadow-control transition-colors hover:bg-accent-hover"
          >
            Copy link
          </button>

          {/*
            * Only where the platform has a share sheet. On a desktop browser
            * without one this button would open nothing, and a dead button
            * beside a working one is worse than one button.
            */}
          {canShare ? (
            <button
              type="button"
              onClick={() => void nativeShare()}
              className="h-10 flex-1 rounded-control bg-surface px-4 text-sm font-medium ring-1 ring-border-strong transition-colors hover:bg-surface-sunken"
            >
              Share
            </button>
          ) : null}
        </div>

        {/* ── Platforms ────────────────────────────────────────────────── */}

        <ul className="mt-3 grid grid-cols-3 gap-2">
          {shareActions(url, name).map((action) =>
            action.href ? (
              <li key={action.target}>
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center justify-center rounded-control bg-surface text-[0.8125rem] font-medium ring-1 ring-border transition-colors hover:bg-surface-sunken"
                >
                  {action.label}
                </a>
              </li>
            ) : (
              <li key={action.target}>
                {/*
                  * No web intent exists for these, so the button does the
                  * thing that actually works — the clipboard — and the note
                  * below says where to paste it.
                  */}
                <button
                  type="button"
                  onClick={() => void copy(action.copyHint ?? "Copied")}
                  className="flex h-10 w-full items-center justify-center rounded-control bg-surface text-[0.8125rem] font-medium ring-1 ring-border transition-colors hover:bg-surface-sunken"
                >
                  {action.label}
                </button>
              </li>
            ),
          )}
        </ul>

        <p
          role="status"
          aria-live="polite"
          className="mt-2 min-h-[1.25rem] text-[0.75rem] text-ink-muted"
        >
          {copied}
        </p>

        {/* ── QR ───────────────────────────────────────────────────────── */}

        <div className="mt-2 border-t border-border pt-3">
          {showQr ? (
            <QrPanel url={url} address={address} />
          ) : (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-control text-[0.8125rem] font-medium text-ink-muted ring-1 ring-border-strong transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                aria-hidden
                className="h-4 w-4"
              >
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
              </svg>
              QR code
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
