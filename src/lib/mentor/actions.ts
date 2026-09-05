"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import { REVIEW_DECISIONS, type ReviewDecision } from "@/lib/mentor/labels";
import type { FeedbackCategory } from "@/types/database";
import type { WorkspaceState } from "@/lib/workspace/action-state";

/**
 * Writes for the mentor layer.
 *
 * The two that carry authority — recording a verdict, answering a question —
 * call database functions. Neither the decision nor the identity of the
 * reviewer is taken from the form: `review_artifact()` reads the caller from
 * the session, refuses a caller who is not staff, refuses one who is not
 * assigned to that learner, and refuses anybody reviewing their own work.
 *
 * There is deliberately no action that lets a learner set an artifact's status.
 * Prompt 4 kept `status` off their grant and this prompt did not add a way
 * round it.
 */

const NOT_CONFIGURED = "LOCK is not connected to a database yet.";

export async function reviewArtifact(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const artifactId = formData.get("artifactId")?.toString();
  const decision = formData.get("decision")?.toString();
  const whatWorks = formData.get("whatWorks")?.toString().trim() ?? "";
  const whatNeedsWork = formData.get("whatNeedsWork")?.toString().trim() ?? "";
  const why = formData.get("why")?.toString().trim() ?? "";
  const nextStep = formData.get("nextStep")?.toString().trim() ?? "";
  const category = (formData.get("category")?.toString() ?? "other") as FeedbackCategory;

  if (!artifactId || !REVIEW_DECISIONS.includes(decision as ReviewDecision)) {
    return { error: "Choose a decision before submitting the review." };
  }

  /*
   * Checked here as well as in the database, and the duplication is on purpose:
   * the database refusal is the guarantee, this one is the sentence a mentor
   * can act on. "A rejection needs something to act on" beats "check violation".
   */
  if (decision === "needs_work" && (whatNeedsWork.length < 10 || nextStep.length < 10)) {
    return {
      error:
        "A returned artifact needs both what is missing and what to do next. Vague feedback teaches nothing.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_artifact", {
    p_artifact_id: artifactId,
    p_status: decision as ReviewDecision,
    p_what_works: whatWorks,
    p_what_needs_work: whatNeedsWork,
    p_why: why,
    p_next_step: nextStep,
    p_category: category,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("your own work")) return { error: "You cannot review your own work." };
    if (message.includes("not assigned")) return { error: "That learner is not assigned to you." };
    if (message.includes("only a mentor")) return { error: "Only a mentor can review work." };
    if (message.includes("not been submitted")) return { error: "That work has not been submitted yet." };
    return { error: "That review did not save. Try again." };
  }

  revalidatePath("/review");
  revalidatePath(`/review/artifacts/${artifactId}`);
  return { error: null, message: "Review recorded." };
}

/** A private note about a learner. Never shown to them — no policy allows it. */
export async function saveMentorNote(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const learnerId = formData.get("learnerId")?.toString();
  const body = formData.get("body")?.toString().trim() ?? "";

  if (!learnerId) return { error: "That note could not be saved." };
  if (body.length < 3) return { error: "Write something worth remembering." };
  if (body.length > 5000) return { error: "That note is too long." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentor_notes")
    .insert({ learner_id: learnerId, author_id: user.id, body });

  if (error) return { error: "That did not save. Try again." };

  revalidatePath(`/review/learners/${learnerId}`);
  return { error: null, message: "Note saved." };
}

export async function deleteMentorNote(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const noteId = formData.get("noteId")?.toString();
  const learnerId = formData.get("learnerId")?.toString();
  if (!noteId) return { error: "That could not be removed." };

  const supabase = await createClient();
  const { error } = await supabase.from("mentor_notes").delete().eq("id", noteId);
  if (error) return { error: "That did not save. Try again." };

  if (learnerId) revalidatePath(`/review/learners/${learnerId}`);
  return { error: null, message: "Removed." };
}

/**
 * Ask the mentor.
 *
 * Attached to the work it is about, which is the difference between this and a
 * chat box: a question with a mission and an artifact behind it can be answered
 * by somebody looking at the same thing.
 */
export async function askMentor(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const question = formData.get("question")?.toString().trim() ?? "";
  const projectId = formData.get("projectId")?.toString() || null;
  const missionId = formData.get("missionId")?.toString() || null;
  const artifactId = formData.get("artifactId")?.toString() || null;

  if (question.length < 10) {
    return { error: "Say a little more — enough that it can be answered without a guess." };
  }
  if (question.length > 4000) return { error: "That question is too long." };

  const supabase = await createClient();
  const { error } = await supabase.from("mentor_questions").insert({
    learner_id: user.id,
    question,
    project_id: projectId,
    mission_id: missionId,
    artifact_id: artifactId,
  });

  if (error) return { error: "That did not send. Try again." };

  revalidatePath("/mentor");
  return { error: null, message: "Sent to your mentor." };
}

/**
 * Answer one.
 *
 * The response is written by a database function so a learner cannot put words
 * in their mentor's mouth — there is no client grant on the `response` column.
 */
export async function answerQuestion(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const questionId = formData.get("questionId")?.toString();
  const response = formData.get("response")?.toString().trim() ?? "";
  const learnerId = formData.get("learnerId")?.toString();

  if (!questionId) return { error: "That could not be sent." };
  if (response.length < 10) {
    return { error: "An answer that says nothing is not an answer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_question", {
    p_question_id: questionId,
    p_response: response,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("only a mentor")) return { error: "Only a mentor can answer." };
    if (message.includes("not assigned")) return { error: "That learner is not assigned to you." };
    return { error: "That did not send. Try again." };
  }

  if (learnerId) revalidatePath(`/review/learners/${learnerId}`);
  revalidatePath("/review");
  return { error: null, message: "Answer sent." };
}

/** Mark a notification read. The only thing a notification supports. */
export async function markNotificationRead(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const id = formData.get("notificationId")?.toString();
  const path = formData.get("path")?.toString();
  if (!id) return { error: "That could not be updated." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "That did not save." };

  if (path) revalidatePath(path);
  return { error: null };
}
