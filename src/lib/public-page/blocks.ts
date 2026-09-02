import { z } from "zod";
import type { BlockType } from "@/types/database";

/**
 * Blocks, treated as untrusted input.
 *
 * The `data` column is JSONB, which means it is whatever was last written to
 * it — by an editor that does not exist yet, through a migration, or by hand in
 * the Supabase dashboard. None of that is a promise about its shape.
 *
 * So every block type declares a schema, and a block whose data does not match
 * is dropped rather than rendered. A block type with no schema here is also
 * dropped: the enum can gain a value before the renderer knows what to do with
 * it, and a half-rendered block is worse than an absent one.
 *
 * There is deliberately no `html` block and no `dangerouslySetInnerHTML`
 * anywhere downstream. Text is text.
 *
 * Phase 4 builds the editor for these. The two implemented here are the
 * smallest pair that proves the pipeline works end to end.
 */

const textBlock = z.object({
  text: z.string().trim().min(1).max(1000),
});

const dividerBlock = z.object({});

/**
 * The renderer's whole vocabulary.
 *
 * `links` and `socials` exist in the database enum because Phase 4 will let a
 * creator place them among other blocks. Until then the page renders those two
 * sections itself, so a block claiming to be one of them is ignored rather than
 * duplicating what is already on the page.
 */
const SCHEMAS = {
  text: textBlock,
  divider: dividerBlock,
} as const satisfies Partial<Record<BlockType, z.ZodType>>;

export type RenderableBlockType = keyof typeof SCHEMAS;

export type TextBlockData = z.infer<typeof textBlock>;

export const isRenderableBlockType = (type: BlockType): type is RenderableBlockType =>
  type in SCHEMAS;

/**
 * Validate one block's data, or reject it.
 *
 * Returns null for an unknown type or data that does not fit, which is the
 * only sane answer: the page has no way to render something it cannot
 * understand, and guessing would put unvalidated strings on screen.
 */
export function parseBlockData(
  type: BlockType,
  data: unknown,
): Record<string, unknown> | null {
  if (!isRenderableBlockType(type)) return null;

  const parsed = SCHEMAS[type].safeParse(data ?? {});
  return parsed.success ? (parsed.data as Record<string, unknown>) : null;
}
