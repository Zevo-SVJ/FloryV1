/**
 * What an optimization action answers with.
 *
 * Values rather than exceptions, for the same reason the editor's actions
 * return values: every failure here has a sentence a creator should read, and
 * a stack trace reaching the browser would be useless to them and a
 * description of our schema.
 */

export type OptimizeResult =
  | {
      ok: true;
      /** What happened, in the past tense, for the confirmation line. */
      summary: string;
      /** The event row, when the change can be put back. */
      undoEventId?: string;
    }
  | { ok: false; message: string };

export type UndoResult = { ok: true; summary: string } | { ok: false; message: string };
