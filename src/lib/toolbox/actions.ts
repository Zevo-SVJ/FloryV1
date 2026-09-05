"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import type { WorkspaceState } from "@/lib/workspace/action-state";

/**
 * Writes for the Toolbox — all of them about the learner, none about content.
 *
 * There is deliberately no action here that creates or edits a Toolbox item.
 * The Toolbox is platform content, no client holds a write grant on it at any
 * role, and authoring is SQL until Prompt 6 decides otherwise. An action that
 * looked like it could edit content would be a lie the database would refuse.
 */

const NOT_CONFIGURED = "LOCK is not connected to a database yet.";

/** Save or unsave, in one action, because the button is one button. */
export async function toggleSaved(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const itemId = formData.get("itemId")?.toString();
  const saved = formData.get("saved")?.toString() === "true";
  const path = formData.get("path")?.toString();

  if (!itemId) return { error: "That could not be saved." };

  const supabase = await createClient();

  const { error } = saved
    ? await supabase.from("learner_saved_items").delete().eq("item_id", itemId)
    : await supabase
        .from("learner_saved_items")
        .insert({ profile_id: user.id, item_id: itemId });

  if (error) return { error: "That did not save. Try again." };

  if (path) revalidatePath(path);
  revalidatePath("/toolbox");
  return { error: null, message: saved ? "Removed" : "Saved" };
}

/**
 * Record that an item was opened.
 *
 * Called from a client component after the page renders rather than during it.
 * A read that writes is a read that fires on a prefetch, a preview and a
 * crawler — and "recently used" would then be a list of pages the browser
 * guessed at rather than pages the learner opened.
 */
export async function recordItemView(itemId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const user = await requireUser();

  const supabase = await createClient();
  await supabase
    .from("learner_recent_items")
    .upsert(
      { profile_id: user.id, item_id: itemId, viewed_at: new Date().toISOString() },
      { onConflict: "profile_id,item_id" },
    );
}

/**
 * Tick, untick, or reset a checklist.
 *
 * The whole set of checked ids is written each time rather than a diff: a
 * checklist is read and written whole, and a diff would need a row per item and
 * an ordering guarantee to avoid two tabs disagreeing.
 *
 * Worth restating where somebody will read it: a completed checklist is not
 * evidence. It is a safety tool. Evidence is the artifact and its links, and
 * that lives in the workspace.
 */
export async function setChecklistState(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const itemId = formData.get("itemId")?.toString();
  const path = formData.get("path")?.toString();
  const reset = formData.get("reset")?.toString() === "true";
  if (!itemId) return { error: "That could not be saved." };

  const checked = reset
    ? []
    : formData.getAll("checked").map((entry) => entry.toString()).filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase
    .from("learner_checklist_progress")
    .upsert(
      { profile_id: user.id, item_id: itemId, checked_ids: checked },
      { onConflict: "profile_id,item_id" },
    );

  if (error) return { error: "That did not save. Try again." };

  if (path) revalidatePath(path);
  return { error: null, message: reset ? "Reset." : "Saved." };
}
