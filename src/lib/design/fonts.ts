import { GeistSans } from "geist/font/sans";
import { Instrument_Serif, Newsreader, Space_Grotesk } from "next/font/google";
import type { FontId } from "@/lib/design/types";

/**
 * Four typefaces, and only one of them is ever downloaded.
 *
 * `next/font/google` fetches these at build time and serves them from our own
 * origin, so a public page never makes a request to Google — which is a
 * privacy property as much as a performance one, since a font request from a
 * creator's visitor is a visit to a third party they did not choose.
 *
 * `preload: false` on all three is deliberate. A preload hint is a promise
 * that the page needs the file immediately, and a page needs exactly one of
 * these. The `@font-face` rules cost about a kilobyte of CSS between them, and
 * the browser fetches a family only when something on the page is set in it —
 * so a creator on Minimal pays nothing for the existence of Newsreader.
 *
 * `display: "swap"` because the alternative is a creator page that shows
 * nothing for the first second on a slow connection, and the whole point of
 * this page is that it opens fast from a bio link.
 *
 * Four, not forty. Each one is a different answer to "what should this page
 * sound like", and a fifth that merely looked slightly different would be a
 * choice nobody could make well.
 */

const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--sm-font-serif",
  // Two weights: body and headings. Italics and a third weight would double
  // the download for a page that sets three lines of text in this face.
  weight: ["400", "600"],
});

const editorial = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--sm-font-editorial",
  weight: "400",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--sm-font-display",
  weight: ["500", "700"],
});

/**
 * Every font's variable, applied together on the page root.
 *
 * One className rather than a lookup, because the CSS custom properties have
 * to exist for the stylesheet's `[data-sm-font]` rules to resolve — and
 * defining four variables is free. What is not free is the font file, and that
 * is still only fetched for the family the page actually uses.
 *
 * Geist is already self-hosted through its package and is the sans.
 */
export const FONT_VARIABLES = [
  GeistSans.variable,
  serif.variable,
  editorial.variable,
  display.variable,
].join(" ");

/** What the picker shows. The stack is what the stylesheet resolves to. */
export const FONTS: Record<FontId, { name: string; description: string }> = {
  sans: { name: "Modern sans", description: "Clean and neutral. The default." },
  serif: { name: "Classic serif", description: "Warm and readable for longer text." },
  editorial: { name: "Editorial", description: "High-contrast display serif." },
  display: { name: "Display", description: "Geometric and a little technical." },
};

export const FONT_ORDER: readonly FontId[] = ["sans", "serif", "editorial", "display"];
