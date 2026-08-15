"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Blink's official mark, drawn.
 *
 * Two forms inside a squircle: an opaque white arch — the profile, the thing
 * that exists — and a translucent ellipse — the way it is seen. Where they
 * overlap, neither wins: the white is knocked back to a lighter blue and the
 * gradient shows through. That intersection is the whole product in one shape,
 * and it recurs everywhere in the interface.
 *
 * The mark is vector rather than raster so it holds at 16px in a tab and at
 * 512px on a splash, and so the gradient can be handed to the rest of the
 * design system as tokens rather than sampled from a bitmap.
 */

/** The arch, in the mark's 100×100 space. */
export const ARCH_PATH =
  "M16 45.5 A20.5 20.5 0 0 1 57 45.5 L57 70 A4 4 0 0 1 53 74 L20 74 A4 4 0 0 1 16 70 Z";

/** The ellipse, in the same space. */
export const LENS = { cx: 66.5, cy: 49.5, rx: 20.5, ry: 24.5 } as const;

/** Measured off the official artwork, corner to corner. */
export const BRAND_GRADIENT = ["#0040F8", "#0A7EFC", "#10B2FD"] as const;

/** Opacity of each region. The overlap is brighter than the lens, never white. */
const LENS_ALPHA = 0.42;
const OVERLAP_ALPHA = 0.7;

export function BlinkMark({
  size = 24,
  className,
  rounded = 27,
}: {
  size?: number;
  className?: string;
  /** Corner radius in the 100-unit space. 0 draws the forms with no plate. */
  rounded?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const grad = `bg-${uid}`;
  const notLens = `nl-${uid}`;
  const notArch = `na-${uid}`;
  const inArch = `ia-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={BRAND_GRADIENT[0]} />
          <stop offset="0.55" stopColor={BRAND_GRADIENT[1]} />
          <stop offset="1" stopColor={BRAND_GRADIENT[2]} />
        </linearGradient>

        {/* Everything except the lens — so the arch reads pure white outside it. */}
        <mask id={notLens} maskUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="#fff" />
          <ellipse {...LENS} fill="#000" />
        </mask>

        {/* Everything except the arch — the lens at its own weight. */}
        <mask id={notArch} maskUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="#fff" />
          <path d={ARCH_PATH} fill="#000" />
        </mask>

        {/* The intersection. */}
        <clipPath id={inArch}>
          <path d={ARCH_PATH} />
        </clipPath>
      </defs>

      <rect
        width="100"
        height="100"
        rx={rounded}
        ry={rounded}
        fill={`url(#${grad})`}
      />
      <path d={ARCH_PATH} fill="#fff" mask={`url(#${notLens})`} />
      <ellipse {...LENS} fill="#fff" opacity={LENS_ALPHA} mask={`url(#${notArch})`} />
      <g clipPath={`url(#${inArch})`}>
        <ellipse {...LENS} fill="#fff" opacity={OVERLAP_ALPHA} />
      </g>
    </svg>
  );
}

/**
 * The two forms alone, in one colour.
 *
 * For places the plate would be wrong — inside a filled button, in a dense
 * list, on top of the gradient itself. The overlap stays legible by dropping
 * to a lower weight instead of changing hue.
 */
export function BlinkGlyph({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const notLens = `gnl-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="10 20 82 60"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <mask id={notLens} maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="100" height="100" fill="#fff" />
          <ellipse {...LENS} fill="#000" />
        </mask>
      </defs>
      <path d={ARCH_PATH} fill="currentColor" mask={`url(#${notLens})`} />
      <ellipse {...LENS} fill="currentColor" opacity="0.34" />
    </svg>
  );
}

export function Wordmark({
  className,
  markSize = 22,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BlinkMark size={markSize} />
      <span className="display text-[1.0625rem] font-semibold tracking-[-0.035em] text-ink">
        Blink
      </span>
    </span>
  );
}
