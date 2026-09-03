"use client";

import { useMemo, useRef, useState } from "react";
import { QUIET_ZONE, encodeQr, isDark, qrPath, type QrMatrix } from "@/lib/qr/encode";

/**
 * The QR code, on screen and on a card.
 *
 * Two renderings of one symbol, from one encoder. On screen it is an SVG path
 * — a few hundred bytes of geometry that stays sharp at any size and needs no
 * canvas — and for download it is drawn onto a canvas at a size that survives
 * being printed.
 *
 * `encodeQr` runs in the browser. It is pure, has no DOM dependency, and lives
 * in a chunk only this component references: the module is reachable from the
 * dashboard's share sheet and from nowhere the public page imports, so a
 * visitor never downloads a QR encoder to look at somebody's links.
 *
 * ── What the download contains ──────────────────────────────────────────────
 *
 * The symbol at 1024px on white, with its four-module quiet zone intact, and
 * the address in small type *below* the quiet zone. Nothing is drawn over the
 * symbol. A logo in the middle of a QR code works by relying on error
 * correction to absorb it, which is spending the budget that was there to
 * survive a scratched card — and text over the modules is worse. The address
 * underneath is the useful thing to add anyway: a printed code whose camera
 * scan fails is useless without it.
 */
export function QrPanel({ url, address }: { url: string; address: string }) {
  /*
   * Encoded once. Choosing a mask means building and scoring the symbol eight
   * times, which is a millisecond and not worth repeating on every render of a
   * panel that also holds two buttons.
   */
  const matrix = useMemo(() => {
    try {
      return encodeQr(url);
    } catch {
      return null;
    }
  }, [url]);

  /*
   * The refusal is handled here and the drawing below, in a component that
   * takes a matrix rather than a maybe-matrix. It is not only about narrowing
   * a type: the canvas ref and the button handlers all close over the symbol,
   * and a component that has to re-check for null inside three closures is one
   * where the check can be forgotten in a fourth.
   */
  if (!matrix) {
    return (
      <p className="text-[0.8125rem] text-ink-muted">
        That address is too long to put in a QR code.
      </p>
    );
  }

  return <Code matrix={matrix} address={address} />;
}

function Code({ matrix, address }: { matrix: QrMatrix; address: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "shared" | "failed">("idle");

  const span = matrix.size + QUIET_ZONE * 2;

  /** The symbol on a canvas, at a size that survives print. */
  function draw(): HTMLCanvasElement | null {
    const element = canvas.current;
    if (!element) return null;

    const scale = Math.max(1, Math.floor(1024 / span));
    const side = span * scale;
    const caption = Math.round(side * 0.11);

    element.width = side;
    element.height = side + caption;

    const context = element.getContext("2d");
    if (!context) return null;

    // White, not transparent. A transparent PNG dropped onto a dark slide
    // becomes a dark-on-dark symbol that no scanner will read.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, element.width, element.height);

    context.fillStyle = "#000000";
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) {
        if (!isDark(matrix, row, col)) continue;
        context.fillRect(
          (col + QUIET_ZONE) * scale,
          (row + QUIET_ZONE) * scale,
          scale,
          scale,
        );
      }
    }

    // Below the quiet zone, never over the symbol.
    context.fillStyle = "#525252";
    context.font = `500 ${Math.round(caption * 0.42)}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(address, side / 2, side + caption * 0.42);

    return element;
  }

  async function toFile(): Promise<File | null> {
    const element = draw();
    if (!element) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      element.toBlob((result) => resolve(result), "image/png");
    });
    if (!blob) return null;

    return new File([blob], `${slug(address)}-qr.png`, { type: "image/png" });
  }

  async function download() {
    const file = await toFile();
    if (!file) {
      setState("failed");
      return;
    }

    const href = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = file.name;
    anchor.click();
    // Revoked on the next tick: revoking synchronously can beat the click in
    // some browsers and produce an empty file.
    setTimeout(() => URL.revokeObjectURL(href), 0);
  }

  async function shareImage() {
    const file = await toFile();
    if (!file) {
      setState("failed");
      return;
    }

    /*
     * `canShare` with the actual file, not a feature check on `share` — a
     * browser can have the Web Share API and refuse files, and the failure
     * mode without this check is a rejected promise where a download would
     * have worked.
     */
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: address });
        setState("shared");
        return;
      } catch {
        // Cancelled, or refused. Either way, fall through to the download.
      }
    }

    await download();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        {/*
          * `shape-rendering: crispEdges` matters here. The default anti-aliases
          * every module edge, and at small sizes that softens the boundary a
          * scanner is looking for. `viewBox` in module units means the size is
          * set entirely in CSS.
          */}
        <svg
          viewBox={`0 0 ${span} ${span}`}
          width={200}
          height={200}
          role="img"
          aria-label={`QR code for ${address}`}
          shapeRendering="crispEdges"
          className="h-[12.5rem] w-[12.5rem] max-w-full rounded-card bg-white p-0"
        >
          <rect width={span} height={span} fill="#ffffff" />
          <g transform={`translate(${QUIET_ZONE} ${QUIET_ZONE})`}>
            <path d={qrPath(matrix)} fill="#000000" />
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void download()}
          className="h-9 flex-1 rounded-control bg-surface px-3 text-[0.8125rem] font-medium ring-1 ring-border-strong transition-colors hover:bg-surface-sunken"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={() => void shareImage()}
          className="h-9 flex-1 rounded-control bg-surface px-3 text-[0.8125rem] font-medium ring-1 ring-border-strong transition-colors hover:bg-surface-sunken"
        >
          Share QR
        </button>
      </div>

      <p aria-live="polite" className="min-h-[1.25rem] text-[0.75rem] text-ink-subtle">
        {state === "shared"
          ? "Sent."
          : state === "failed"
            ? "That image could not be created here. The link above still works."
            : `Points at ${address}. Print it at 2cm or larger.`}
      </p>

      {/* Never displayed; it exists only so `getContext` has somewhere to draw. */}
      <canvas ref={canvas} className="hidden" aria-hidden />
    </div>
  );
}

/** `showme.at/8zevo` → `showme-at-8zevo`, for a filename. */
const slug = (address: string): string =>
  address.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "showme";
