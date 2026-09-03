import type { CSSProperties } from "react";
import { HEX_PATTERN, type DesignConfig, type Palette, type ResolvedDesign } from "@/lib/design/types";
import { DEFAULT_THEME, themeOf } from "@/lib/design/themes";

/**
 * Turning a creator's choices into something a page can wear.
 *
 * Two steps, and they are separate on purpose.
 *
 * `resolveDesign` lays the stored overrides over the chosen theme and answers
 * every question the renderer can ask. It is pure, so the public page and the
 * editor's preview run the identical function on the identical input and
 * cannot disagree.
 *
 * `designStyle` and `designAttributes` turn that into the two things the DOM
 * actually receives: a set of CSS custom properties, and a handful of `data-`
 * attributes. Everything visual is then a stylesheet rule keyed off those —
 * which means there is exactly one place where a design becomes CSS, and it
 * only ever emits values that came from a hex pattern or a literal tuple.
 *
 * No component below this ever sees a `DesignConfig`. They see `var(--sm-…)`.
 */

/* ── Resolution ───────────────────────────────────────────────────────────── */

/** A last line of defence: anything that is not a hex colour is discarded. */
const safeHex = (value: string | undefined, fallback: string): string =>
  value && HEX_PATTERN.test(value) ? value : fallback;

function resolvePalette(theme: Palette, overrides: Partial<Palette> | undefined): Palette {
  return {
    background: safeHex(overrides?.background, theme.background),
    text: safeHex(overrides?.text, theme.text),
    muted: safeHex(overrides?.muted, theme.muted),
    accent: safeHex(overrides?.accent, theme.accent),
    buttonBackground: safeHex(overrides?.buttonBackground, theme.buttonBackground),
    buttonText: safeHex(overrides?.buttonText, theme.buttonText),
  };
}

export function resolveDesign(config: DesignConfig | null | undefined): ResolvedDesign {
  const design = config ?? {};
  const theme = themeOf(design.theme);

  return {
    theme: theme.id,
    colors: resolvePalette(theme.colors, design.colors),
    background: design.background ?? theme.background,
    font: design.typography?.font ?? theme.font,
    scale: design.typography?.scale ?? theme.scale,
    buttonStyle: design.buttons?.style ?? theme.buttonStyle,
    buttonShape: design.buttons?.shape ?? theme.buttonShape,
    blockStyle: design.blocks?.style ?? theme.blockStyle,
    socialStyle: design.socials?.style ?? theme.socialStyle,
    width: design.layout?.width ?? theme.width,
    spacing: design.layout?.spacing ?? theme.spacing,
    header: design.layout?.header ?? theme.header,
    avatar: design.layout?.avatar ?? theme.avatar,
  };
}

export const DEFAULT_DESIGN: ResolvedDesign = resolveDesign({ theme: DEFAULT_THEME });

/* ── Tokens ───────────────────────────────────────────────────────────────── */

/**
 * `#1a2b3c` → `26 43 60`, so a colour can be used at partial opacity.
 *
 * Borders, frosted surfaces and hover states are all "the text colour, faintly",
 * and `rgb(var(--sm-text-rgb) / 12%)` expresses that in one place instead of
 * making every theme declare six more colours it would then have to keep in
 * step with the first six.
 */
function channels(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

const WIDTHS = { compact: "26rem", standard: "30rem", wide: "36rem" } as const;

/** Block-to-block rhythm, and the page's own top and bottom padding. */
const SPACING = {
  tight: { gap: "1.5rem", pad: "2.5rem" },
  standard: { gap: "2.25rem", pad: "3.5rem" },
  relaxed: { gap: "3rem", pad: "4.5rem" },
} as const;

/**
 * The type scale, as a single multiplier.
 *
 * Every size on the page is expressed against `--sm-type`, so three steps move
 * the whole page coherently. Individual font-size controls would let somebody
 * make a heading smaller than the caption beneath it.
 */
const TYPE = { compact: "0.94", standard: "1", spacious: "1.08" } as const;

const RADII = { square: "2px", rounded: "12px", pill: "999px" } as const;

/**
 * The background layer, as a single `background` value.
 *
 * Built here rather than in a stylesheet because it is the one token whose
 * *shape* depends on a choice — a colour, two colours and an angle, or a URL.
 * Every piece of it is either a validated hex, an angle from a literal tuple,
 * or a URL that passed the storage-host check, and the URL is wrapped in
 * `url("…")` with quotes plus an encode so a stray parenthesis cannot end the
 * function early.
 */
function backgroundLayers(design: ResolvedDesign): { image: string; overlay: string } {
  const { background, colors } = design;

  if (background.kind === "solid") {
    // A solid colour is the page's own background-color, so there is no image
    // layer at all — `none` rather than a one-stop gradient standing in for it.
    return { image: "none", overlay: "transparent" };
  }

  if (background.kind === "gradient" && background.gradient) {
    const { from, to, angle } = background.gradient;
    return {
      image: `linear-gradient(${angle}deg, ${safeHex(from, colors.background)}, ${safeHex(to, colors.background)})`,
      overlay: "transparent",
    };
  }

  if (background.kind === "image" && background.image) {
    const { url, overlay } = background.image;
    return {
      /*
       * `encodeURI` leaves an ordinary storage URL untouched and escapes the
       * characters that could end the `url()` early. The URL has already
       * passed the storage-host check, so this is the second of two locks on
       * the one token in this file that is not an enum or a hex colour.
       */
      image: `url("${encodeURI(url).replace(/["()]/g, encodeURIComponent)}")`,
      overlay: `rgb(${channels(colors.background)} / ${Math.min(85, Math.max(0, overlay))}%)`,
    };
  }

  return { image: "none", overlay: "transparent" };
}

/**
 * The custom properties a page carries.
 *
 * Applied as an inline `style` on the page's root element. Inline rather than a
 * `<style>` block because there is no string concatenation anywhere in it:
 * React sets these as properties, so a value can only ever be a value — it can
 * never close a declaration and start a rule.
 */
export function designStyle(design: ResolvedDesign): CSSProperties {
  const { colors } = design;
  const layers = backgroundLayers(design);
  const spacing = SPACING[design.spacing];

  // A solid background is a colour the creator picked for the page itself, so
  // it stands in for the palette's background everywhere it is referenced —
  // including the overlay tint and the frosted surfaces derived from it.
  const surface =
    design.background.kind === "solid"
      ? safeHex(design.background.color, colors.background)
      : colors.background;

  return {
    "--sm-bg": surface,
    "--sm-bg-rgb": channels(surface),
    "--sm-text": colors.text,
    "--sm-text-rgb": channels(colors.text),
    "--sm-muted": colors.muted,
    "--sm-accent": colors.accent,
    "--sm-accent-rgb": channels(colors.accent),
    "--sm-btn-bg": colors.buttonBackground,
    "--sm-btn-bg-rgb": channels(colors.buttonBackground),
    "--sm-btn-text": colors.buttonText,

    /*
     * The page's own background-color is always the palette colour, so a
     * gradient or photograph that fails to load leaves a designed page rather
     * than a white one.
     */
    "--sm-layer-image": layers.image,
    "--sm-overlay": layers.overlay,
    "--sm-bg-position": design.background.image?.position ?? "center",

    "--sm-width": WIDTHS[design.width],
    "--sm-gap": spacing.gap,
    "--sm-pad": spacing.pad,
    "--sm-type": TYPE[design.scale],
    "--sm-radius": RADII[design.buttonShape],
  } as CSSProperties;
}

/**
 * The switches a stylesheet rule can key off.
 *
 * Every one is an enum member, so `[data-sm-buttons="pill"]` can only match a
 * value this repository defined. Keeping them as attributes rather than class
 * names means the rules read as what they are — a design decision and its
 * consequences — and that a page's whole configuration is visible in devtools.
 */
export function designAttributes(design: ResolvedDesign): Record<string, string> {
  return {
    "data-sm-theme": design.theme,
    "data-sm-buttons": design.buttonStyle,
    "data-sm-shape": design.buttonShape,
    "data-sm-blocks": design.blockStyle,
    "data-sm-socials": design.socialStyle,
    "data-sm-header": design.header,
    "data-sm-avatar": design.avatar,
    "data-sm-font": design.font,
    ...(design.background.kind === "image" ? { "data-sm-bg": "image" } : {}),
    ...(design.background.kind === "image" && design.background.image?.blur
      ? { "data-sm-bg-blur": "true" }
      : {}),
  };
}
