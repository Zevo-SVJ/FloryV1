import { z } from "zod";
import { urlSchema } from "@/lib/validation/url";
import { isRenderableMediaUrl } from "@/lib/media/url";
import { EMBED_PROVIDERS, VIDEO_PROVIDERS, resolveEmbed } from "@/lib/embeds/providers";
import { contactItemSchema } from "@/lib/contact/actions";

/**
 * What each kind of block is allowed to contain.
 *
 * `blocks.data` is JSONB, which means it is whatever was last written to it —
 * by this editor, by a migration, or by somebody with the anon key and a
 * console open. None of that is a promise about its shape, so every read
 * validates and every write validates again.
 *
 * One schema per type, in one file, is the thing that makes the rest of the
 * feature small: the editor derives its defaults from here, the save action
 * parses against here, and the renderer receives a value it can destructure
 * without checking anything.
 *
 * A block whose data fails its schema is dropped rather than rendered. That is
 * the only honest answer — the page has no way to draw something it cannot
 * understand, and guessing would put unvalidated strings on screen.
 */

/* ── Shared pieces ────────────────────────────────────────────────────────── */

/**
 * An image that lives in our own Storage bucket.
 *
 * Not `urlSchema`: that accepts any http(s) address, and an image tag is a
 * request the server makes on a visitor's behalf. Restricting it to the
 * project's own bucket is what stops a creator from using a ShowMe page to
 * pull a tracking pixel — or to point the image optimizer at an arbitrary host.
 */
const storedImageUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(isRenderableMediaUrl, "That image is not stored on ShowMe.");

/**
 * Alt text.
 *
 * Optional, because a decorative image with an empty alt is correct markup and
 * forcing a description would produce screen-reader noise like "image123.jpg".
 * The editor asks for one and explains why; the schema does not insist.
 */
const altText = z.string().trim().max(200).default("");

const caption = z.string().trim().max(120).default("");

/** A button attached to a block: a label and somewhere safe to go. */
const callToAction = z
  .object({
    label: z.string().trim().min(1, "Give the button a label.").max(40),
    url: urlSchema,
  })
  .nullable()
  .default(null);

/* ── One schema per block type ────────────────────────────────────────────── */

/**
 * A links section.
 *
 * The links themselves are rows in the `links` table, not JSON in here: they
 * are first-class data that Phase 6's `link_clicks` will reference by id, and
 * burying them in a blob would make per-link analytics a rewrite. What the
 * block carries is only what belongs to the section itself.
 */
export const linksBlockSchema = z.object({
  /** An optional heading above the links — "Latest", "Shop", "Listen". */
  title: z.string().trim().max(60).default(""),
  /*
   * A grid of buttons is a *layout* of this block, not a second kind of link.
   *
   * That is the whole reason "link grid" is a value here rather than a block
   * type of its own: it renders the same `links` rows, with the same ids,
   * through the same `/go/<id>` redirect. A separate grid block would have
   * meant a second set of link rows, and every click on one of them would have
   * been attributed to a link identity the creator never made — which is
   * exactly how a dashboard starts lying.
   */
  layout: z.enum(["list", "grid"]).default("list"),
});

/**
 * The row of social marks.
 *
 * Reads `social_links` for the profile, for the same reason: one row per
 * platform, enforced by a unique index, so the set cannot disagree with itself
 * across two blocks.
 */
export const socialsBlockSchema = z.object({});

export const textBlockSchema = z.object({
  text: z.string().trim().min(1, "Write something.").max(1000),
  align: z.enum(["left", "center", "right"]).default("center"),
  /*
   * Two styles, not a rich text editor. A heading and a paragraph are the two
   * things a creator page actually needs, and every step beyond that is a
   * sanitiser to maintain and a way for markup to reach the page.
   */
  style: z.enum(["body", "heading"]).default("body"),
});

/**
 * A real heading.
 *
 * The text block has had a "heading" *style* since Phase 4, and it is a
 * paragraph that looks like one. This is the semantic article: an `<h2>` or an
 * `<h3>` in the document outline, which is what a screen reader navigates by
 * and what a search engine reads as structure.
 *
 * Two levels and no more. The creator's name is the page's `h1`, so a section
 * heading is an `h2` and a heading inside a section is an `h3` — anything
 * below that on a page this short is an outline nobody is navigating. There is
 * no free-form level field, because the one thing a heading block must never
 * become is a way to write `<h1>` into somebody else's document.
 */
export const headingBlockSchema = z.object({
  text: z.string().trim().min(1, "Write the heading.").max(80),
  level: z.enum(["section", "subsection"]).default("section"),
  align: z.enum(["left", "center", "right"]).default("center"),
});

/**
 * Deliberate air.
 *
 * Three named sizes, derived from the page's own spacing scale, so a spacer on
 * a tight layout is smaller than the same spacer on a relaxed one and the page
 * stays coherent. No pixel field: an arbitrary number is how a page ends up
 * with a 137px gap that looks wrong on every other screen than the one it was
 * chosen on.
 */
export const spacerBlockSchema = z.object({
  size: z.enum(["small", "medium", "large"]).default("medium"),
});

/**
 * Ways to be reached.
 *
 * The items are a discriminated union — see `lib/contact/actions.ts` — because
 * each kind is a different URL scheme built from a differently validated
 * value. Nothing typed here reaches an `href` unchecked.
 */
export const contactBlockSchema = z.object({
  title: z.string().trim().max(60).default(""),
  items: z
    .array(contactItemSchema)
    .min(1, "Add a way to be reached.")
    .max(6),
});

export const imageBlockSchema = z.object({
  url: storedImageUrl,
  alt: altText,
  /** An image that is also a button. Null means it is just an image. */
  href: urlSchema.nullable().default(null),
  aspect: z.enum(["auto", "square", "wide", "portrait"]).default("auto"),
});

const galleryItemSchema = z.object({
  /*
   * Carried in the JSON because a gallery image is not a row anywhere — it has
   * no clicks to attribute and no life outside its block. Generated by the
   * editor so React keys and reordering stay stable across a save.
   */
  id: z.string().trim().min(1).max(64),
  url: storedImageUrl,
  alt: altText,
  caption,
  /*
   * Somewhere to go. Untracked, deliberately: a click row references a link
   * id, and a gallery image has no row — inventing shadow `links` rows for
   * each image would double every page's link count and put entries in the
   * dashboard's "top links" that the creator never created. Documented in the
   * README rather than papered over.
   */
  href: urlSchema.nullable().default(null),
});

export const galleryBlockSchema = z.object({
  title: z.string().trim().max(60).default(""),
  /*
   * A snapping row or a grid. The row is the better default on a phone — the
   * next card peeking past the edge is what says there is more, and it costs
   * no vertical space — but a portfolio of nine images reads as a grid, so the
   * choice is the creator's.
   */
  layout: z.enum(["carousel", "grid"]).default("carousel"),
  /*
   * At least one image, because a gallery with none renders as nothing at all
   * and a creator whose save succeeded would have no way to tell. Refusing it
   * is what turns an invisible block into a sentence in the editor.
   */
  items: z.array(galleryItemSchema).min(1, "Add at least one image.").max(24),
  aspect: z.enum(["square", "portrait", "wide"]).default("portrait"),
  cta: callToAction,
});

/** Validated by whether it resolves to a provider, never by pattern alone. */
const providerUrl = (allowed: typeof VIDEO_PROVIDERS) =>
  z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((value) => resolveEmbed(value, allowed) !== null, "That link is not supported.");

export const videoBlockSchema = z.object({
  url: providerUrl(VIDEO_PROVIDERS),
  title: z.string().trim().max(60).default(""),
});

export const embedBlockSchema = z.object({
  url: providerUrl(EMBED_PROVIDERS),
  title: z.string().trim().max(60).default(""),
});

/**
 * A line between two parts of the page.
 *
 * Three treatments rather than a colour and a thickness: the rule takes its
 * colour from the page's own text token at a low opacity, so it belongs to
 * every theme without a creator having to match it by eye.
 */
export const dividerBlockSchema = z.object({
  style: z.enum(["line", "subtle", "space"]).default("line"),
});

/* ── The data a block of each type carries ────────────────────────────────── */

export type LinksBlockData = z.infer<typeof linksBlockSchema>;
export type SocialsBlockData = z.infer<typeof socialsBlockSchema>;
export type TextBlockData = z.infer<typeof textBlockSchema>;
export type ImageBlockData = z.infer<typeof imageBlockSchema>;
export type GalleryBlockData = z.infer<typeof galleryBlockSchema>;
export type GalleryItem = z.infer<typeof galleryItemSchema>;
export type VideoBlockData = z.infer<typeof videoBlockSchema>;
export type EmbedBlockData = z.infer<typeof embedBlockSchema>;
export type DividerBlockData = z.infer<typeof dividerBlockSchema>;
export type HeadingBlockData = z.infer<typeof headingBlockSchema>;
export type SpacerBlockData = z.infer<typeof spacerBlockSchema>;
export type ContactBlockData = z.infer<typeof contactBlockSchema>;
