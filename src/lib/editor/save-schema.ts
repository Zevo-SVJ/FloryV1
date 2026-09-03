import { z } from "zod";
import { BLOCKS } from "@/lib/blocks/registry";
import { SOCIAL_PLATFORMS, bioSchema, displayNameSchema } from "@/lib/validation/schemas";
import { socialUrlSchema, urlSchema } from "@/lib/validation/url";
import { isRenderableMediaUrl } from "@/lib/media/url";
import type { BlockType } from "@/types/database";

/**
 * What the server will accept as "here is my page".
 *
 * The editor validates as somebody types, which is a courtesy. This is the
 * thing that decides. The save action is a Server Action, reachable by a
 * direct POST from anything that can produce one, so every field arrives
 * untrusted — including the ones the editor's own forms would never send
 * wrong.
 *
 * Note what is absent: no `profile_id`, anywhere. Ownership comes from the
 * session on the server, and Row Level Security refuses the write even if it
 * did not. A payload that could name its own owner is a payload that can edit
 * somebody else's page.
 *
 * Ids are accepted from the client, which is safe for the same reason. A
 * client that invents an id gets a row of its own; a client that sends
 * somebody else's id gets a refusal from RLS, because the upsert's update path
 * cannot see a row it does not own.
 */

/**
 * A uuid, and only a uuid.
 *
 * These become primary keys. The save function casts them in SQL, so anything
 * that is not a uuid would abort the transaction with a database error rather
 * than a message somebody can read — which makes this the right place to say
 * no.
 */
const rowId = z.uuid("Malformed id.");

const linkSchema = z.object({
  id: rowId,
  title: z
    .string()
    .trim()
    .min(1, "Give the link a title.")
    .max(80, "That title is too long."),
  url: urlSchema,
  isActive: z.boolean(),
});

const socialSchema = z.object({
  id: rowId,
  platform: z.enum(SOCIAL_PLATFORMS),
  // Wider than `urlSchema` by exactly one scheme: a contact row may be a
  // `mailto:`. The database's own constraint says the same thing.
  url: socialUrlSchema,
  isActive: z.boolean(),
});

/**
 * A block, validated against its own type's schema.
 *
 * `superRefine` rather than a discriminated union: the registry already holds
 * one schema per type, and restating them here as a union would be a second
 * list to keep in step. Looking the schema up by type means a new block type
 * is validated correctly the moment it is registered.
 */
const blockSchema = z
  .object({
    id: rowId,
    type: z.enum(Object.keys(BLOCKS) as [BlockType, ...BlockType[]]),
    data: z.record(z.string(), z.unknown()),
    isVisible: z.boolean(),
    links: z.array(linkSchema).max(100),
  })
  .superRefine((block, ctx) => {
    const parsed = BLOCKS[block.type].schema.safeParse(block.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          path: ["data", ...issue.path],
          message: issue.message,
        });
      }
      return;
    }
    // Replaced with the parsed value, so defaults are applied and any extra
    // key a client added is gone before it reaches the database.
    block.data = parsed.data as Record<string, unknown>;
  });

export const savePageSchema = z.object({
  profile: z.object({
    displayName: displayNameSchema,
    bio: bioSchema,
    /*
     * Our own Storage bucket or nothing. `urlSchema` would accept any http
     * address, and an avatar is an image tag the server renders on a
     * stranger's behalf.
     */
    avatarUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(isRenderableMediaUrl, "That image is not stored on ShowMe.")
      .nullable(),
  }),
  socials: z.array(socialSchema).max(SOCIAL_PLATFORMS.length),
  blocks: z.array(blockSchema).max(60),
});

export type SavePagePayload = z.infer<typeof savePageSchema>;
