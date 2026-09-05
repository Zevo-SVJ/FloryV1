/**
 * What a learning action hands back.
 *
 * In its own module because a `"use server"` file may only export async
 * functions — a plain object or a type-only const there is a build error.
 */

export interface BlockResponseState {
  error: string | null;
  /** Null for a block with no right answer: a decision, a reflection. */
  correct?: boolean | null;
  /** Set once an answer exists, so the renderer knows to show the reveal. */
  answered?: boolean;
}

export const emptyResponseState: BlockResponseState = { error: null };

export interface LessonActionState {
  error: string | null;
  message?: string | null;
}

export const emptyLessonState: LessonActionState = { error: null };
