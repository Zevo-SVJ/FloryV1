import { z } from "zod";
import { isRenderableMediaUrl } from "@/lib/media/url";
import {
  AVATAR_SIZES,
  BACKGROUND_KINDS,
  BLOCK_STYLES,
  BUTTON_SHAPES,
  BUTTON_STYLES,
  CONTENT_WIDTHS,
  FONT_IDS,
  GRADIENT_ANGLES,
  HEADER_LAYOUTS,
  HEX_PATTERN,
  IMAGE_POSITIONS,
  SOCIAL_STYLES,
  SPACINGS,
  THEME_IDS,
  TYPE_SCALES,
  type DesignConfig,
} from "@/lib/design/types";

/**
 * What a design is allowed to be.
 *
 * The single most important file in this phase, because every value it accepts
 * ends up inside a `style` attribute or a `data-` attribute on a page that
 * strangers load. A design is the one part of ShowMe where user input becomes
 * presentation, and presentation is one careless `unknown` away from being
 * script.
 *
 * Two rules hold everywhere below:
 *
 *   · Colours are six-digit hex and nothing else. Not `rgb()`, not a named
 *     colour, not `var(--x)` — and above all not the arbitrary string that
 *     would let somebody close a declaration and open their own.
 *
 *   · Every other field is an enum drawn from a literal tuple. An id that is
 *     not in the tuple cannot be stored, so the renderer's `data-` attributes
 *     can only ever hold values this codebase wrote.
 *
 * The schema is applied on the way in *and* on the way out. A row hand-edited
 * in the Supabase dashboard, or written by a version of the app that has since
 * changed, comes back as a design the renderer understands — or as the default
 * one. It never comes back as broken CSS.
 */

/** Lowercased first, so `#FFF000` from a colour input is stored consistently. */
const hex = z
  .string()
  .trim()
  .toLowerCase()
  .regex(HEX_PATTERN, "Use a colour like #1a1a1a.");

const paletteSchema = z
  .object({
    background: hex,
    text: hex,
    muted: hex,
    accent: hex,
    buttonBackground: hex,
    buttonText: hex,
  })
  .partial();

const gradientSchema = z.object({
  from: hex,
  to: hex,
  /*
   * Eight directions rather than 0–360. A gradient angle is a design decision
   * with about eight useful answers, and a number field invites 37deg — which
   * is not a look, it is a mistake nobody can see they made.
   */
  angle: z.union(GRADIENT_ANGLES.map((angle) => z.literal(angle)) as [
    z.ZodLiteral<(typeof GRADIENT_ANGLES)[number]>,
    ...z.ZodLiteral<(typeof GRADIENT_ANGLES)[number]>[],
  ]),
});

const imageBackgroundSchema = z.object({
  /*
   * Our own Storage bucket, exactly like every other image on the page. A
   * background is a full-bleed request the browser makes on a visitor's
   * behalf; pointing it at an arbitrary host would make every page view a
   * ping to somebody else's server.
   */
  url: z
    .string()
    .trim()
    .max(2048)
    .refine(isRenderableMediaUrl, "That image is not stored on ShowMe."),
  position: z.enum(IMAGE_POSITIONS).default("center"),
  /*
   * Capped at 85 rather than 100: an overlay that can reach opaque is a
   * control that lets somebody hide the photograph they just uploaded and then
   * wonder where it went.
   */
  overlay: z.number().int().min(0).max(85).default(45),
  blur: z.boolean().default(false),
});

const backgroundSchema = z
  .object({
    kind: z.enum(BACKGROUND_KINDS),
    color: hex.optional(),
    gradient: gradientSchema.optional(),
    image: imageBackgroundSchema.optional(),
  })
  .superRefine((value, ctx) => {
    // A kind with nothing behind it would silently fall back to the theme,
    // which looks to a creator like their choice was ignored.
    const missing =
      (value.kind === "solid" && !value.color) ||
      (value.kind === "gradient" && !value.gradient) ||
      (value.kind === "image" && !value.image);

    if (missing) {
      ctx.addIssue({
        code: "custom",
        message: `A ${value.kind} background needs its ${value.kind === "solid" ? "colour" : value.kind === "gradient" ? "colours" : "image"}.`,
        path: ["kind"],
      });
    }
  });

export const designSchema = z.object({
  theme: z.enum(THEME_IDS).optional(),
  colors: paletteSchema.optional(),
  background: backgroundSchema.optional(),
  typography: z
    .object({ font: z.enum(FONT_IDS).optional(), scale: z.enum(TYPE_SCALES).optional() })
    .optional(),
  buttons: z
    .object({
      style: z.enum(BUTTON_STYLES).optional(),
      shape: z.enum(BUTTON_SHAPES).optional(),
    })
    .optional(),
  blocks: z.object({ style: z.enum(BLOCK_STYLES).optional() }).optional(),
  socials: z.object({ style: z.enum(SOCIAL_STYLES).optional() }).optional(),
  layout: z
    .object({
      width: z.enum(CONTENT_WIDTHS).optional(),
      spacing: z.enum(SPACINGS).optional(),
      header: z.enum(HEADER_LAYOUTS).optional(),
      avatar: z.enum(AVATAR_SIZES).optional(),
    })
    .optional(),
});

/**
 * Read a stored design, or fall back to the default one.
 *
 * Never throws and never returns something partly understood. A page whose
 * design column is nonsense renders as Minimal, which is a page — where
 * refusing to render, or rendering half a theme, is not.
 */
export function parseDesign(value: unknown): DesignConfig {
  const parsed = designSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}
