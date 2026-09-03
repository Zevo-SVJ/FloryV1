import type {
  AvatarSize,
  BackgroundConfig,
  BlockStyle,
  ButtonShape,
  ButtonStyle,
  ContentWidth,
  FontId,
  HeaderLayout,
  Palette,
  SocialStyle,
  Spacing,
  ThemeId,
  TypeScale,
} from "@/lib/design/types";

/**
 * Seven complete designs.
 *
 * A theme is not a colour preset. It answers every question the renderer can
 * ask — palette, background, typeface, button style and shape, block surface,
 * social treatment, width, spacing, header — so that choosing one produces a
 * page somebody designed rather than a page with new colours in it. That is
 * the difference between this and a swatch picker, and it is why each entry
 * below is long.
 *
 * They are deliberately far apart. Two themes that differ by a shade of grey
 * are one theme and a bug report; a creator scanning this list should be able
 * to tell in a glance which one is theirs.
 *
 * Every value a creator overrides wins over the theme, and everything they do
 * not override keeps arriving from here — so refining a theme later improves
 * the pages that chose it instead of requiring a migration.
 */

export interface Theme {
  id: ThemeId;
  name: string;
  /** One line, shown under the name in the picker. */
  description: string;
  colors: Palette;
  background: BackgroundConfig;
  font: FontId;
  scale: TypeScale;
  buttonStyle: ButtonStyle;
  buttonShape: ButtonShape;
  blockStyle: BlockStyle;
  socialStyle: SocialStyle;
  width: ContentWidth;
  spacing: Spacing;
  header: HeaderLayout;
  avatar: AvatarSize;
}

/**
 * Minimal — the default, and the one most pages should stay on.
 *
 * Warm off-white, near-black text, one dark button. No borders doing work that
 * space could do. This is the design a creator gets without opening the panel,
 * and it has to be good enough that opening the panel is optional.
 */
const minimal: Theme = {
  id: "minimal",
  name: "Minimal",
  description: "Off-white and near-black. Quiet, and hard to get wrong.",
  colors: {
    background: "#fbfbfa",
    text: "#12131a",
    muted: "#6b7180",
    accent: "#12131a",
    buttonBackground: "#12131a",
    buttonText: "#ffffff",
  },
  background: { kind: "theme" },
  font: "sans",
  scale: "standard",
  buttonStyle: "filled",
  buttonShape: "rounded",
  blockStyle: "flat",
  socialStyle: "plain",
  width: "standard",
  spacing: "standard",
  header: "centered",
  avatar: "standard",
};

/**
 * Noir — for pages that are mostly photographs.
 *
 * True black rather than charcoal, because an image sitting on #000 has no
 * edge and reads as part of the page. Glass buttons for the same reason: a
 * solid button over a dark photograph is a rectangle, a frosted one is a
 * surface.
 */
const noir: Theme = {
  id: "noir",
  name: "Noir",
  description: "True black with frosted buttons. Built around images.",
  colors: {
    background: "#000000",
    text: "#f5f6f8",
    muted: "#8b8f9a",
    accent: "#ffffff",
    buttonBackground: "#ffffff",
    buttonText: "#000000",
  },
  background: { kind: "theme" },
  font: "sans",
  scale: "standard",
  buttonStyle: "glass",
  buttonShape: "rounded",
  blockStyle: "minimal",
  socialStyle: "circle",
  width: "standard",
  spacing: "standard",
  header: "centered",
  avatar: "large",
};

/**
 * Paper — warm, printed, unhurried.
 *
 * Cream and ink, a reading serif, and generous spacing. The one theme where
 * long text is the point rather than something to get past.
 */
const paper: Theme = {
  id: "paper",
  name: "Paper",
  description: "Cream, ink and a reading serif. Made for words.",
  colors: {
    background: "#f6f1e7",
    text: "#211d17",
    muted: "#7a7266",
    accent: "#8a5a2b",
    buttonBackground: "#211d17",
    buttonText: "#f6f1e7",
  },
  background: { kind: "theme" },
  font: "serif",
  scale: "spacious",
  buttonStyle: "outline",
  buttonShape: "square",
  blockStyle: "flat",
  socialStyle: "plain",
  width: "compact",
  spacing: "relaxed",
  header: "centered",
  avatar: "standard",
};

/**
 * Editorial — a masthead, not a profile.
 *
 * White, black, one red. The header goes left-aligned because that is what
 * makes it read as a publication rather than a business card, and the buttons
 * lose their radius entirely.
 */
const editorial: Theme = {
  id: "editorial",
  name: "Editorial",
  description: "White, black, one red. Left-aligned like a masthead.",
  colors: {
    background: "#ffffff",
    text: "#0a0a0a",
    muted: "#6e6e6e",
    accent: "#d33f26",
    buttonBackground: "#0a0a0a",
    buttonText: "#ffffff",
  },
  background: { kind: "theme" },
  font: "editorial",
  scale: "standard",
  buttonStyle: "minimal",
  buttonShape: "square",
  blockStyle: "flat",
  socialStyle: "plain",
  width: "standard",
  spacing: "standard",
  header: "compact",
  avatar: "standard",
};

/**
 * Glass — depth, without a particle system.
 *
 * A deep two-colour gradient with frosted surfaces on top. The gradient is
 * part of the theme rather than something a creator has to assemble, because
 * the whole style depends on the surfaces having something to be translucent
 * against.
 */
const glass: Theme = {
  id: "glass",
  name: "Glass",
  description: "A deep gradient with frosted surfaces floating on it.",
  colors: {
    background: "#0b1020",
    text: "#f2f5ff",
    muted: "#9aa3c0",
    accent: "#7aa2ff",
    buttonBackground: "#ffffff",
    buttonText: "#0b1020",
  },
  background: {
    kind: "gradient",
    gradient: { from: "#141b36", to: "#070a14", angle: 135 },
  },
  font: "sans",
  scale: "standard",
  buttonStyle: "glass",
  buttonShape: "pill",
  blockStyle: "glass",
  socialStyle: "circle",
  width: "standard",
  spacing: "standard",
  header: "centered",
  avatar: "standard",
};

/**
 * Bold — the page is the colour.
 *
 * A saturated ground with black type on it, pill buttons, tight spacing. Loud
 * on purpose, and the reason the palette editor exists: this is the theme
 * people will want in their own colour.
 */
const bold: Theme = {
  id: "bold",
  name: "Bold",
  description: "A saturated ground and black type. Loud on purpose.",
  colors: {
    background: "#e8ff5a",
    text: "#111111",
    muted: "#4a4f33",
    accent: "#111111",
    buttonBackground: "#111111",
    buttonText: "#e8ff5a",
  },
  background: { kind: "theme" },
  font: "display",
  scale: "compact",
  buttonStyle: "filled",
  buttonShape: "pill",
  blockStyle: "flat",
  socialStyle: "outline",
  width: "compact",
  spacing: "tight",
  header: "centered",
  avatar: "standard",
};

/**
 * Soft — rounded, pastel, friendly.
 *
 * The counterweight to Bold: the same willingness to use colour, aimed at
 * warmth rather than volume. Soft buttons, soft cards, a pale gradient that
 * never fights the content sitting on it.
 */
const soft: Theme = {
  id: "soft",
  name: "Soft",
  description: "Pale gradient, rounded everything, gentle contrast.",
  colors: {
    background: "#fdf2f6",
    text: "#2b2030",
    muted: "#8a7b90",
    accent: "#c2668f",
    buttonBackground: "#ffffff",
    buttonText: "#2b2030",
  },
  background: {
    kind: "gradient",
    gradient: { from: "#fdf2f6", to: "#eef2fd", angle: 180 },
  },
  font: "sans",
  scale: "standard",
  buttonStyle: "soft",
  buttonShape: "pill",
  blockStyle: "card",
  socialStyle: "circle",
  width: "standard",
  spacing: "relaxed",
  header: "centered",
  avatar: "large",
};

export const THEMES: Record<ThemeId, Theme> = {
  minimal,
  noir,
  paper,
  editorial,
  glass,
  bold,
  soft,
};

/** The order the picker shows them in: quietest first. */
export const THEME_ORDER: readonly ThemeId[] = [
  "minimal",
  "noir",
  "paper",
  "editorial",
  "glass",
  "soft",
  "bold",
];

export const DEFAULT_THEME: ThemeId = "minimal";

export const themeOf = (id: ThemeId | undefined): Theme => THEMES[id ?? DEFAULT_THEME];
