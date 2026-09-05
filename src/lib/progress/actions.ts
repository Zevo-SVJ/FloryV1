"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import type { WorkspaceState } from "@/lib/workspace/action-state";

/**
 * The one progress write a person may make.
 *
 * Everything else in this system is written by the database, inside the
 * transaction that earned it — XP, skill evidence and automatic milestones
 * have no client grant at any role. This action exists for the handful of
 * milestones LOCK genuinely cannot observe: a real user, a real payment, a
 * learner who no longer needs the program.
 *
 * The decision is not taken here. `award_milestone()` refuses a caller who is
 * not staff, refuses one acting on their own account, and refuses one not
 * assigned to that learner. This function's job is to turn those refusals into
 * a sentence a mentor can read.
 */

const NOT_CONFIGURED = "LOCK is not connected to a database yet.";

export async function awardMilestone(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const learnerId = formData.get("learnerId")?.toString();
  const milestoneKey = formData.get("milestoneKey")?.toString();
  const note = formData.get("note")?.toString().trim() ?? "";

  if (!learnerId || !milestoneKey) {
    return { error: "Choose a milestone to award." };
  }

  /*
   * Asked for here as well as recommended in the interface. A milestone
   * awarded with no reason is a milestone nobody can audit later, and the
   * learner reads this note on their own achievements page.
   */
  if (note.length > 0 && note.length < 5) {
    return { error: "Say what you saw, or leave the note empty." };
  }
  if (note.length > 500) return { error: "That note is too long." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("award_milestone", {
    p_profile_id: learnerId,
    p_milestone_key: milestoneKey,
    p_note: note,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("yourself")) {
      return { error: "You cannot award yourself a milestone." };
    }
    if (message.includes("not assigned")) {
      return { error: "That learner is not assigned to you." };
    }
    if (message.includes("only a mentor")) {
      return { error: "Only a mentor can award a milestone." };
    }
    if (message.includes("already earned")) {
      return { error: "They already have that one." };
    }
    if (message.includes("no such milestone")) {
      return { error: "No such milestone." };
    }
    return { error: "That did not save. Try again." };
  }

  revalidatePath(`/review/learners/${learnerId}`);
  return { error: null, message: "Milestone awarded." };
}
