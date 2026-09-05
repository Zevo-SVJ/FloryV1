import type { CompletionRule, ConfidenceLevel, LessonType } from "@/types/database";

/**
 * Words the interface uses for the learning system's enums.
 *
 * Its own module, with no server imports, because both Server and Client
 * Components need them. They started life in `queries.ts` — which is
 * `server-only` and reaches `next/headers` — and a client control importing one
 * label dragged the whole data access layer into the browser bundle. TypeScript
 * cannot see that; the production build can, and did.
 *
 * The rule this encodes: a constant shared across the server/client boundary
 * belongs in a module that imports nothing from either side.
 */

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  solid: "I understand this",
  shaky: "I mostly understand this",
  revisit: "I need to revisit this",
};

export const COMPLETION_HINT: Record<CompletionRule, string> = {
  read: "Finish reading, then mark this done.",
  knowledge_check: "Answer every check correctly to finish this lesson.",
  decision: "Make the decision above to finish this lesson.",
  reflection: "Write your reflection above to finish this lesson.",
  practical: "This lesson finishes with practical work, which arrives with missions.",
};

/** Lesson types read better with a space than with their database underscore. */
export const lessonTypeLabel = (type: LessonType): string => type.replace(/_/g, " ");
