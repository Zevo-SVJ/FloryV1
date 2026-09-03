import { HEX_PATTERN, type Palette } from "@/lib/design/types";

/**
 * Whether a design can actually be read.
 *
 * Customization that can make a page unusable is customization that will. The
 * editor does not forbid a low-contrast pairing — a creator may know exactly
 * what they are doing with a faint caption over a photograph — but it says so,
 * next to the control that caused it, rather than letting somebody discover it
 * from a stranger who could not read their page.
 *
 * The maths is WCAG 2.1's relative luminance and contrast ratio, which is worth
 * implementing rather than approximating: "is this dark or light" gets the easy
 * cases right and is wrong exactly where a warning would have mattered.
 */

export interface ContrastCheck {
  ratio: number;
  /** AA for body text. */
  passes: boolean;
  /** AA for text at 18.66px bold or 24px regular, which headings clear. */
  passesLarge: boolean;
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. Returns null for anything that is not a hex colour. */
export function luminance(hex: string): number | null {
  if (!HEX_PATTERN.test(hex)) return null;

  const r = channel(Number.parseInt(hex.slice(1, 3), 16));
  const g = channel(Number.parseInt(hex.slice(3, 5), 16));
  const b = channel(Number.parseInt(hex.slice(5, 7), 16));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 1 (identical) to 21 (black on white). Null when either colour is malformed. */
export function contrastRatio(a: string, b: string): number | null {
  const first = luminance(a);
  const second = luminance(b);
  if (first === null || second === null) return null;

  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkContrast(foreground: string, background: string): ContrastCheck | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return null;

  return {
    // One decimal place: the difference between 4.51 and 4.53 is not something
    // anybody should be shown, and rounding to it invites chasing the number.
    ratio: Math.round(ratio * 10) / 10,
    passes: ratio >= 4.5,
    passesLarge: ratio >= 3,
  };
}

export interface ContrastWarning {
  /** Which control to put the message beside. */
  key: "text" | "muted" | "buttonText";
  message: string;
}

/**
 * Everything worth telling a creator about a palette.
 *
 * Three pairings matter, and no more: the body text on its background, the
 * muted text on the same background, and a button's label on the button. A
 * warning for every possible pair would be noise nobody reads.
 *
 * Muted text is held to the large-text threshold rather than the body one. It
 * is used for bios and captions and is *meant* to recede; failing it at 4.5
 * would fire on almost every good design and teach people to ignore the panel.
 */
export function paletteWarnings(colors: Palette): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];

  const text = checkContrast(colors.text, colors.background);
  if (text && !text.passes) {
    warnings.push({
      key: "text",
      message: `Your text is hard to read on this background (${text.ratio}:1, and 4.5:1 is the readable minimum).`,
    });
  }

  const muted = checkContrast(colors.muted, colors.background);
  if (muted && !muted.passesLarge) {
    warnings.push({
      key: "muted",
      message: `Your secondary text will be difficult to read (${muted.ratio}:1).`,
    });
  }

  const button = checkContrast(colors.buttonText, colors.buttonBackground);
  if (button && !button.passes) {
    warnings.push({
      key: "buttonText",
      message: `Your button labels are hard to read on the button colour (${button.ratio}:1).`,
    });
  }

  return warnings;
}
