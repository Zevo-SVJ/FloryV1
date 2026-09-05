/**
 * What a workspace action hands back.
 *
 * Its own module: a `"use server"` file may only export async functions.
 */
export interface WorkspaceState {
  error: string | null;
  message?: string | null;
  /** Set when a project was just created, so the page can move on. */
  projectSlug?: string;
}

export const emptyWorkspaceState: WorkspaceState = { error: null };
