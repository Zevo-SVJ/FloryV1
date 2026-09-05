import { z } from "zod";

/**
 * The content block vocabulary.
 *
 * A lesson is an ordered array of these, stored as JSONB. This module is the
 * contract between the database and the renderer, and it is the only place a
 * block's shape is defined — the schema below produces the TypeScript type, so
 * the two cannot drift.
 *
 * Every lesson is parsed through `parseBlocks` on the way out of the database.
 * That is the price of JSONB and it is worth paying once, here, at a single
 * boundary: a malformed block becomes a caught error next to the query rather
 * than an exception thrown from inside a component during a render.
 *
 * Adding a block type is three edits and no migration: a schema here, a case in
 * the renderer registry, a component. Nothing else in the system needs to know.
 *
 * Every block carries a stable `id`. Learner responses are keyed on it, so
 * renaming one orphans an answer — the database refuses a block without one.
 */

const base = { id: z.string().min(1).max(80) };

/* ── Presentational ──────────────────────────────────────────────────────── */

const heading = z.object({
  ...base,
  kind: z.literal("heading"),
  /* 2 and 3 only. The lesson title is the page's h1, and a block that could
     emit a second one would break the document outline. */
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string().min(1),
});

const text = z.object({ ...base, kind: z.literal("text"), text: z.string().min(1) });

const callout = z.object({
  ...base,
  kind: z.literal("callout"),
  /*
   * `why` and `real_world` are the two the brief names, and they are tones
   * rather than separate block types because they differ only in their label
   * and colour — a third component would be a third thing to keep consistent.
   */
  tone: z.enum(["note", "tip", "warning", "why", "real_world"]),
  title: z.string().optional(),
  text: z.string().min(1),
});

const quote = z.object({
  ...base,
  kind: z.literal("quote"),
  text: z.string().min(1),
  attribution: z.string().optional(),
});

/**
 * An image is teaching material, so `alt` is required and `caption` is
 * encouraged. A diagram nobody can read on a phone teaches nothing, and a
 * diagram a screen reader cannot describe teaches nothing at all.
 */
const image = z.object({
  ...base,
  kind: z.literal("image"),
  /*
   * `.url()` alone accepts any scheme `new URL()` parses — `http:`, and
   * `javascript:` with it. These render directly in the learner's browser
   * rather than being proxied, so the scheme is checked here at the parse
   * boundary, where every other block is validated.
   */
  src: z.string().url().refine((value) => value.startsWith("https://"), {
    message: "an image must be served over https",
  }),
  alt: z.string().min(1),
  caption: z.string().optional(),
  /** Screenshot, diagram, comparison — changes the frame, not the component. */
  variant: z.enum(["figure", "screenshot", "diagram"]).default("figure"),
});

const code = z.object({
  ...base,
  kind: z.literal("code"),
  language: z.string().default("text"),
  code: z.string().min(1),
  filename: z.string().optional(),
});

const terminal = z.object({
  ...base,
  kind: z.literal("terminal"),
  command: z.string().min(1),
  output: z.string().optional(),
});

/** A reusable prompt, with the reason it is shaped the way it is. */
const promptBlock = z.object({
  ...base,
  kind: z.literal("prompt"),
  title: z.string().min(1),
  prompt: z.string().min(1),
  why: z.string().optional(),
});

const checklist = z.object({
  ...base,
  kind: z.literal("checklist"),
  title: z.string().optional(),
  items: z.array(z.string().min(1)).min(1),
});

const steps = z.object({
  ...base,
  kind: z.literal("steps"),
  title: z.string().optional(),
  items: z.array(z.string().min(1)).min(1),
});

const comparison = z.object({
  ...base,
  kind: z.literal("comparison"),
  title: z.string().optional(),
  left: z.object({ label: z.string(), points: z.array(z.string()).min(1) }),
  right: z.object({ label: z.string(), points: z.array(z.string()).min(1) }),
});

const table = z.object({
  ...base,
  kind: z.literal("table"),
  columns: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
});

const expandable = z.object({
  ...base,
  kind: z.literal("expandable"),
  summary: z.string().min(1),
  text: z.string().min(1),
});

/**
 * External material, always with its reason.
 *
 * `why` is required here as it is in the database. "Watch this video" is not
 * teaching; "watch this because it demonstrates the workflow above" is. LOCK
 * must also stand up if the video disappears, so a video block supplements a
 * lesson and never carries it.
 */
const video = z.object({
  ...base,
  kind: z.literal("video"),
  url: z.string().url(),
  title: z.string().min(1),
  source: z.string().optional(),
  why: z.string().min(10),
  durationSeconds: z.number().int().positive().optional(),
  startSeconds: z.number().int().nonnegative().optional(),
});

/* ── Interactive ─────────────────────────────────────────────────────────── */

const option = z.object({ id: z.string().min(1), label: z.string().min(1) });

/** Graded. `correct` holds option ids; order does not matter. */
const choice = z.object({
  ...base,
  kind: z.literal("choice"),
  question: z.string().min(1),
  multiple: z.boolean().default(false),
  options: z.array(option).min(2),
  correct: z.array(z.string()).min(1),
  explanation: z.string().min(1),
});

const booleanCheck = z.object({
  ...base,
  kind: z.literal("boolean"),
  question: z.string().min(1),
  correct: z.array(z.enum(["true", "false"])).length(1),
  explanation: z.string().min(1),
});

/** Graded, and order is the whole answer. */
const ordering = z.object({
  ...base,
  kind: z.literal("ordering"),
  question: z.string().min(1),
  items: z.array(option).min(2),
  correct: z.array(z.string()).min(2),
  explanation: z.string().min(1),
});

const shortAnswer = z.object({
  ...base,
  kind: z.literal("short_answer"),
  question: z.string().min(1),
  guidance: z.string().optional(),
});

/**
 * "What would you do?" — the judgement block.
 *
 * Ungraded on purpose. Every option carries its tradeoff, one is recommended,
 * and the explanation says why. Marking a judgement right or wrong would teach
 * somebody to guess the platform's preference instead of reasoning about the
 * situation, which is the opposite of the point.
 */
const decision = z.object({
  ...base,
  kind: z.literal("decision"),
  situation: z.string().min(1),
  options: z.array(option.extend({ tradeoff: z.string().min(1) })).min(2),
  recommended: z.string().min(1),
  explanation: z.string().min(1),
});

/** "Predict before reveal" — commit to an answer, then see the analysis. */
const predict = z.object({
  ...base,
  kind: z.literal("predict"),
  situation: z.string().min(1),
  prompt: z.string().min(1),
  reveal: z.string().min(1),
});

/** "Your move" — the same loop, without a situation to read first. */
const yourMove = z.object({
  ...base,
  kind: z.literal("your_move"),
  prompt: z.string().min(1),
  reveal: z.string().min(1),
});

const reflection = z.object({
  ...base,
  kind: z.literal("reflection"),
  prompt: z.string().min(1),
});

export const blockSchema = z.discriminatedUnion("kind", [
  heading, text, callout, quote, image, code, terminal, promptBlock,
  checklist, steps, comparison, table, expandable, video,
  choice, booleanCheck, ordering, shortAnswer, decision, predict, yourMove, reflection,
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockKind = Block["kind"];

/** Blocks that ask the learner for something and store the answer. */
export const INTERACTIVE_KINDS = [
  "choice", "boolean", "ordering", "short_answer",
  "decision", "predict", "your_move", "reflection",
] as const satisfies readonly BlockKind[];

/** Blocks the database grades. The rest record engagement, not correctness. */
export const GRADED_KINDS = ["choice", "boolean", "ordering"] as const satisfies readonly BlockKind[];

export const isInteractive = (block: Block): boolean =>
  (INTERACTIVE_KINDS as readonly string[]).includes(block.kind);

export const isGraded = (block: Block): boolean =>
  (GRADED_KINDS as readonly string[]).includes(block.kind);

/**
 * Parse a lesson's blocks, dropping any the schema rejects.
 *
 * Dropping rather than throwing, and that is a deliberate trade. A lesson is
 * long; one malformed block should cost that block, not the whole page — a
 * learner who cannot open a lesson at all is worse off than one missing a
 * callout. The rejected block is reported so it is not silent.
 */
export function parseBlocks(value: unknown): { blocks: Block[]; rejected: number } {
  if (!Array.isArray(value)) return { blocks: [], rejected: 0 };

  const blocks: Block[] = [];
  let rejected = 0;

  for (const candidate of value) {
    const parsed = blockSchema.safeParse(candidate);
    if (parsed.success) blocks.push(parsed.data);
    else rejected += 1;
  }

  return { blocks, rejected };
}
