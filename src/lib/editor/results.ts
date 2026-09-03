/**
 * What the editor's actions hand back.
 *
 * In its own module because a `"use server"` file may only export async
 * functions — a type export beside them is legal, but a const is not, and
 * keeping both here means the boundary never has to be re-litigated.
 */

export interface SaveOk {
  ok: true;
  /** ISO timestamp, so the editor can say when rather than just that. */
  savedAt: string;
}

export interface SaveFailed {
  ok: false;
  message: string;
  /** Which block the problem is in, so the editor can open and highlight it. */
  blockId?: string;
}

export type SaveResult = SaveOk | SaveFailed;

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export type DeleteResult = { ok: true } | { ok: false; message: string };
