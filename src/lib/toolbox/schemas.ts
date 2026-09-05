import { z } from "zod";

/**
 * What each kind of Toolbox item carries in its body.
 *
 * The table is one table with a `kind` and a JSONB body; this module is the
 * contract that makes that safe. Every item is parsed here on the way out of
 * the database, so a malformed body is a caught error at one boundary rather
 * than an exception thrown from inside a renderer — the same trade, for the
 * same reason, as lesson blocks in Prompt 3.
 *
 * Every kind answers at least: what is this, why does it matter, when do I use
 * it, what should I produce with it. Those are required fields rather than
 * conventions, so an item that answers none of them cannot be authored.
 */

export const TOOLBOX_KINDS = [
  "prompt", "framework", "template", "checklist", "resource", "stack_tool",
] as const;

export type ToolboxKind = (typeof TOOLBOX_KINDS)[number];

/* ── prompt ──────────────────────────────────────────────────────────────── */

export const promptBody = z.object({
  whatItDoes: z.string().min(1),
  whenToUse: z.string().min(1),
  prompt: z.string().min(1),
  howToUse: z.string().min(1),
  expectedOutput: z.string().min(1),
  commonMistake: z.string().min(1),
  /* Placeholders the learner replaces. Displayed so they are obvious rather
     than something to notice halfway through a conversation. Deliberately not
     a substitution engine: a token list a person edits by hand is enough, and
     an engine would be a feature nobody asked for. */
  variables: z
    .array(z.object({ token: z.string().min(1), description: z.string().min(1) }))
    .default([]),
});

/* ── framework ───────────────────────────────────────────────────────────── */

export const frameworkBody = z.object({
  purpose: z.string().min(1),
  explanation: z.string().min(1),
  /* The visual: a chain of short labels, rendered as a flow. Text rather than
     an image, so it reads on a phone, survives a theme change and can be
     copied. */
  flow: z.array(z.string().min(1)).default([]),
  steps: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  example: z.string().min(1),
  whenToUse: z.string().min(1),
  commonMistake: z.string().min(1),
});

/* ── template ────────────────────────────────────────────────────────────── */

export const templateBody = z.object({
  instructions: z.string().min(1),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        guidance: z.string().min(1),
      }),
    )
    .min(1),
  example: z.string().optional(),
});

/* ── checklist ───────────────────────────────────────────────────────────── */

export const checklistBody = z.object({
  intro: z.string().min(1),
  groups: z
    .array(
      z.object({
        title: z.string().min(1),
        items: z
          .array(
            z.object({
              /* Stable, because a learner's ticks are keyed on it. The database
                 refuses an item without one. */
              id: z.string().min(1),
              label: z.string().min(1),
              detail: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

/* ── resource ────────────────────────────────────────────────────────────── */

export const resourceBody = z.object({
  resourceKind: z.enum(["video", "article", "doc", "tool", "book"]),
  url: z.string().url(),
  source: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  startSeconds: z.number().int().nonnegative().optional(),
  endSeconds: z.number().int().nonnegative().optional(),
  /**
   * Required, and the whole reason a resource is worth having here.
   *
   * "Watch this video" is filler. "Watch 04:20–11:10 after the research lesson,
   * because it shows the interview technique being used badly and then well" is
   * teaching. A resource nobody justified cannot be authored.
   */
  why: z.string().min(20),
});

/* ── stack tool ──────────────────────────────────────────────────────────── */

export const stackToolBody = z.object({
  what: z.string().min(1),
  why: z.string().min(1),
  whenToUse: z.string().min(1),
  /* Named, because the point is judgement rather than memorisation. A learner
     who knows only one tool has not chosen it. */
  alternatives: z.array(z.string().min(1)).default([]),
  commonMistake: z.string().min(1),
  docsUrl: z.string().url().optional(),
});

export type PromptBody = z.infer<typeof promptBody>;
export type FrameworkBody = z.infer<typeof frameworkBody>;
export type TemplateBody = z.infer<typeof templateBody>;
export type ChecklistBody = z.infer<typeof checklistBody>;
export type ResourceBody = z.infer<typeof resourceBody>;
export type StackToolBody = z.infer<typeof stackToolBody>;

const BY_KIND = {
  prompt: promptBody,
  framework: frameworkBody,
  template: templateBody,
  checklist: checklistBody,
  resource: resourceBody,
  stack_tool: stackToolBody,
} as const;

/**
 * An item whose body has been checked against its kind.
 *
 * A discriminated union, so a component that switches on `kind` gets the exact
 * body type in each branch and cannot read a field the other kinds do not have.
 */
export type ToolboxBody =
  | { kind: "prompt"; body: PromptBody }
  | { kind: "framework"; body: FrameworkBody }
  | { kind: "template"; body: TemplateBody }
  | { kind: "checklist"; body: ChecklistBody }
  | { kind: "resource"; body: ResourceBody }
  | { kind: "stack_tool"; body: StackToolBody };

/**
 * Parse one item's body.
 *
 * Returns null rather than throwing, and the caller decides. A list drops the
 * item; a detail page says the item could not be read. Neither should be a
 * crash — a single malformed row must not take down the library.
 */
export function parseToolboxBody(kind: string, body: unknown): ToolboxBody | null {
  const schema = BY_KIND[kind as ToolboxKind];
  if (!schema) return null;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return null;

  return { kind, body: parsed.data } as ToolboxBody;
}

/** Plural labels for the six kinds, used for section headings and filters. */
export const KIND_LABEL: Record<ToolboxKind, string> = {
  prompt: "Prompt",
  framework: "Framework",
  template: "Template",
  checklist: "Checklist",
  resource: "Resource",
  stack_tool: "Stack",
};

export const KIND_PLURAL: Record<ToolboxKind, string> = {
  prompt: "Prompts",
  framework: "Frameworks",
  template: "Templates",
  checklist: "Checklists",
  resource: "Resources",
  stack_tool: "Stack",
};

/** Where each kind's list lives. Resources sit under the Resources section. */
export const KIND_PATH: Record<ToolboxKind, string> = {
  prompt: "/toolbox/prompts",
  framework: "/toolbox/frameworks",
  template: "/toolbox/templates",
  checklist: "/toolbox/checklists",
  resource: "/resources/references",
  stack_tool: "/toolbox/stack",
};
