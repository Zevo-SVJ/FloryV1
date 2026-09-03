/**
 * The vocabulary of a ShowMe design.
 *
 * Every choice a creator can make is a value from one of these lists. Nothing
 * here is a free-form string except a colour, and a colour is a six-digit hex
 * validated by pattern — because everything in this file eventually becomes a
 * CSS custom property or a `data-` attribute on the public page, and the one
 * thing that must never happen is a creator's value becoming CSS.
 *
 * That is the whole security model of this phase, and it is why the lists are
 * `as const` tuples rather than open unions: an id that is not in the list
 * cannot be stored, cannot be resolved, and cannot reach the page.
 *
 * Content is not in this file. A link has a title and a URL; a theme decides
 * what a link looks like. The separation is what lets a creator try six themes
 * without touching a single row of what they wrote.
 */

/* ── Themes ───────────────────────────────────────────────────────────────── */

export const THEME_IDS = [
  "minimal",
  "noir",
  "paper",
  "editorial",
  "glass",
  "bold",
  "soft",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/* ── Colour ───────────────────────────────────────────────────────────────── */

/**
 * The six colours a creator can override.
 *
 * Six, not sixteen. Every other colour on the page — borders, the muted rule
 * under a caption, the ring on a focused link — is derived from these, so a
 * page cannot end up with a border that belongs to a different design than the
 * background behind it.
 */
export interface Palette {
  /** Behind everything. Also the fallback when a background image fails. */
  background: string;
  /** Headings, link labels, anything that must be read. */
  text: string;
  /** Bios, captions, section titles. */
  muted: string;
  /** Focus rings, the one colour that is allowed to be loud. */
  accent: string;
  buttonBackground: string;
  buttonText: string;
}

export const PALETTE_KEYS = [
  "background",
  "text",
  "muted",
  "accent",
  "buttonBackground",
  "buttonText",
] as const satisfies readonly (keyof Palette)[];

/** Six-digit hex, lowercase. The only colour syntax that is ever stored. */
export const HEX_PATTERN = /^#[0-9a-f]{6}$/;

/* ── Background ───────────────────────────────────────────────────────────── */

export const BACKGROUND_KINDS = ["theme", "solid", "gradient", "image"] as const;
export type BackgroundKind = (typeof BACKGROUND_KINDS)[number];

/** Eight directions, because a gradient angle is a choice and not a slider. */
export const GRADIENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type GradientAngle = (typeof GRADIENT_ANGLES)[number];

export const IMAGE_POSITIONS = ["center", "top", "bottom"] as const;
export type ImagePosition = (typeof IMAGE_POSITIONS)[number];

export interface GradientBackground {
  from: string;
  to: string;
  angle: GradientAngle;
}

export interface ImageBackground {
  /** Must live in our own Storage bucket. Checked by the schema. */
  url: string;
  position: ImagePosition;
  /**
   * How much of the page colour is laid over the photo, 0–85.
   *
   * Not decoration: a photograph behind body text is unreadable at 0, and this
   * is the control that fixes it. The editor defaults it high and says why.
   */
  overlay: number;
  /** A soft blur, so a busy photo stops competing with the words on it. */
  blur: boolean;
}

export interface BackgroundConfig {
  kind: BackgroundKind;
  /** Used when `kind` is "solid". */
  color?: string;
  gradient?: GradientBackground;
  image?: ImageBackground;
}

/* ── Typography ───────────────────────────────────────────────────────────── */

export const FONT_IDS = ["sans", "serif", "editorial", "display"] as const;
export type FontId = (typeof FONT_IDS)[number];

/** How large and how airy the type is. Three steps, not a size in pixels. */
export const TYPE_SCALES = ["compact", "standard", "spacious"] as const;
export type TypeScale = (typeof TYPE_SCALES)[number];

/* ── Buttons ──────────────────────────────────────────────────────────────── */

export const BUTTON_STYLES = ["filled", "outline", "soft", "minimal", "glass"] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export const BUTTON_SHAPES = ["square", "rounded", "pill"] as const;
export type ButtonShape = (typeof BUTTON_SHAPES)[number];

/* ── Blocks ───────────────────────────────────────────────────────────────── */

/**
 * How a block's surface is drawn.
 *
 * Applies to the blocks that have a surface. An image and a gallery are their
 * own surface — putting a card behind a photograph is what makes a page look
 * like a database rather than something somebody made — so they take the
 * radius and the shadow from this and nothing else.
 */
export const BLOCK_STYLES = ["flat", "card", "glass", "minimal"] as const;
export type BlockStyle = (typeof BLOCK_STYLES)[number];

export const SOCIAL_STYLES = ["plain", "circle", "outline"] as const;
export type SocialStyle = (typeof SOCIAL_STYLES)[number];

/* ── Layout ───────────────────────────────────────────────────────────────── */

export const CONTENT_WIDTHS = ["compact", "standard", "wide"] as const;
export type ContentWidth = (typeof CONTENT_WIDTHS)[number];

export const SPACINGS = ["tight", "standard", "relaxed"] as const;
export type Spacing = (typeof SPACINGS)[number];

export const HEADER_LAYOUTS = ["centered", "compact"] as const;
export type HeaderLayout = (typeof HEADER_LAYOUTS)[number];

export const AVATAR_SIZES = ["standard", "large"] as const;
export type AvatarSize = (typeof AVATAR_SIZES)[number];

/* ── The stored shape ─────────────────────────────────────────────────────── */

/**
 * What sits in `profiles.design`.
 *
 * Everything is optional, and that is the point: a stored design is the
 * *difference* between the chosen theme and what the creator changed. A
 * creator who picked Noir and nothing else stores `{"theme":"noir"}`, and
 * every one of Noir's decisions continues to reach them when a theme is
 * refined later. Freezing a full resolved design into the row would turn every
 * design improvement into a data migration.
 */
export interface DesignConfig {
  theme?: ThemeId;
  colors?: Partial<Palette>;
  background?: BackgroundConfig;
  typography?: { font?: FontId; scale?: TypeScale };
  buttons?: { style?: ButtonStyle; shape?: ButtonShape };
  blocks?: { style?: BlockStyle };
  socials?: { style?: SocialStyle };
  layout?: {
    width?: ContentWidth;
    spacing?: Spacing;
    header?: HeaderLayout;
    avatar?: AvatarSize;
  };
}

/**
 * A design with every question answered.
 *
 * What the renderer receives. `resolveDesign()` produces it by laying the
 * creator's overrides over their theme, so no component ever has to ask
 * whether a value was set.
 */
export interface ResolvedDesign {
  theme: ThemeId;
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
