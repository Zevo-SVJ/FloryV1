import { z } from "zod";
import { usernameSchema } from "@/lib/validation/username";
import { urlSchema } from "@/lib/validation/url";

/**
 * The shapes the server will accept.
 *
 * Everything that crosses the boundary into a Server Action or Route Handler
 * is parsed here first. Client-side validation exists to be helpful; this
 * exists to be true.
 *
 * Note what is deliberately absent: no schema accepts a `profile_id`. Ownership
 * is taken from the session on the server, never from the request — a payload
 * that could name its own owner is a payload that can edit someone else's page.
 */

/* ── Account ──────────────────────────────────────────────────────────────── */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

/**
 * Long enough to matter, and that is the whole rule.
 *
 * Composition requirements (a digit, a symbol, a capital) push people toward
 * predictable substitutions and password reuse. Length is what actually helps.
 * Supabase enforces its own project-level minimum on top of this.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Passwords can be at most 72 characters.");

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

/* ── Profile ──────────────────────────────────────────────────────────────── */

export const displayNameSchema = z
  .string()
  .trim()
  .max(60, "Display names can be at most 60 characters.");

export const bioSchema = z
  .string()
  .trim()
  .max(280, "Bios can be at most 280 characters.");

export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  display_name: displayNameSchema.nullable().optional(),
  bio: bioSchema.nullable().optional(),
  avatar_url: urlSchema.nullable().optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/* ── Page content ─────────────────────────────────────────────────────────── */

export const positionSchema = z.number().int().min(0).max(10_000);

export const linkInputSchema = z.object({
  title: z.string().trim().min(1, "Give the link a title.").max(80, "That title is too long."),
  url: urlSchema,
  position: positionSchema.optional(),
  is_active: z.boolean().optional(),
});

export type LinkInput = z.infer<typeof linkInputSchema>;

/**
 * The platforms a social link may claim to be.
 *
 * An enum rather than free text: the public page will render an icon per
 * platform, and an open string field would mean rendering an icon for a value
 * nobody has designed. Adding a platform is one entry here and one value in the
 * database enum.
 */
export const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "threads",
  "facebook",
  "linkedin",
  "github",
  "twitch",
  "spotify",
  "soundcloud",
  "pinterest",
  "snapchat",
  "discord",
  "telegram",
  "whatsapp",
  "email",
  "website",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);

export const socialLinkInputSchema = z.object({
  platform: socialPlatformSchema,
  url: urlSchema,
  position: positionSchema.optional(),
  is_active: z.boolean().optional(),
});

export type SocialLinkInput = z.infer<typeof socialLinkInputSchema>;

/**
 * Blocks.
 *
 * The editor is a later phase, so `data` stays an open object here and JSONB in
 * the database. What is pinned down now is the set of block types, because the
 * public renderer will switch on it and an unknown type has no rendering.
 */
export const BLOCK_TYPES = [
  "links",
  "socials",
  "text",
  "image",
  "video",
  "embed",
  "divider",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const blockTypeSchema = z.enum(BLOCK_TYPES);

export const blockInputSchema = z.object({
  type: blockTypeSchema,
  position: positionSchema.optional(),
  is_visible: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type BlockInput = z.infer<typeof blockInputSchema>;
