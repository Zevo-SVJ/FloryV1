"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import type { ConfidenceLevel } from "@/types/database";
import type { BlockResponseState, LessonActionState } from "@/lib/learning/action-state";

/**
 * Writes for the learning system.
 *
 * Two of these call database functions rather than writing tables, and that is
 * the security model rather than a style: `record_block_response` computes
 * whether an answer was right, and `complete_lesson` decides whether a lesson
 * has been earned. Neither verdict is accepted from the caller, and the tables
 * behind them grant no direct write — so a learner who calls these actions with
 * a crafted payload gets the same answer as one using the interface.
 *
 * Every action re-derives the learner from the session. Nothing here reads an
 * owner from a form field.
 */

const NOT_CONFIGURED = "LOCK is not connected to a database yet.";

/** Records an answer and returns what the database decided about it. */
export async function submitBlockResponse(
  _prev: BlockResponseState,
  formData: FormData,
): Promise<BlockResponseState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const lessonId = formData.get("lessonId")?.toString();
  const blockId = formData.get("blockId")?.toString();
  const lessonSlug = formData.get("lessonSlug")?.toString();

  if (!lessonId || !blockId) return { error: "That answer could not be sent." };

  /*
   * Two shapes, because the blocks need two. A graded question sends its chosen
   * option ids under `value` as an array; an open one sends its text under
   * `value` as a string. The database reads `response -> 'value'` either way.
   */
  const selections = formData.getAll("value").map((entry) => entry.toString()).filter(Boolean);
  const openText = formData.get("text")?.toString().trim();

  if (selections.length === 0 && !openText) {
    return { error: "Answer before continuing." };
  }

  const response = openText !== undefined && openText !== ""
    ? { value: openText }
    : { value: selections };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_block_response", {
    p_lesson_id: lessonId,
    p_block_id: blockId,
    p_response: response,
  });

  if (error) return { error: "That answer could not be saved. Try again." };

  if (lessonSlug) revalidatePath(`/learn/lessons/${lessonSlug}`);

  return {
    error: null,
    correct: data?.is_correct ?? null,
    answered: true,
  };
}

/**
 * Marks a lesson complete, if the database agrees it has been earned.
 *
 * The error messages map the function's own refusals back into the lesson's
 * language. They are not decoration: "answer the check correctly first" is the
 * difference between a learner who knows what to do and one who clicks the
 * button again.
 */
export async function completeLesson(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const lessonId = formData.get("lessonId")?.toString();
  const lessonSlug = formData.get("lessonSlug")?.toString();
  if (!lessonId) return { error: "That lesson could not be completed." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("knowledge check")) {
      return { error: "Answer every check correctly before finishing this lesson." };
    }
    if (message.includes("decision not recorded")) {
      return { error: "Make the decision above before finishing this lesson." };
    }
    if (message.includes("reflection not recorded")) {
      return { error: "Write your reflection before finishing this lesson." };
    }
    if (message.includes("missions system")) {
      return { error: "This lesson finishes with practical work, which arrives with missions." };
    }
    return { error: "That did not save. Try again." };
  }

  if (lessonSlug) revalidatePath(`/learn/lessons/${lessonSlug}`);
  revalidatePath("/learn");
  return { error: null, message: "Lesson complete." };
}

/** The learner's own read on whether it landed. */
export async function setConfidence(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const lessonId = formData.get("lessonId")?.toString();
  const level = formData.get("confidence")?.toString();
  const lessonSlug = formData.get("lessonSlug")?.toString();

  const allowed: ConfidenceLevel[] = ["solid", "shaky", "revisit"];
  if (!lessonId || !allowed.includes(level as ConfidenceLevel)) {
    return { error: "That could not be saved." };
  }

  const supabase = await createClient();

  // The row may not exist yet — reading a lesson without answering anything
  // never created one. Insert first, ignore the conflict, then update.
  await supabase
    .from("learner_lesson_progress")
    .insert({ profile_id: user.id, lesson_id: lessonId });

  const { error } = await supabase
    .from("learner_lesson_progress")
    .update({ confidence: level as ConfidenceLevel })
    .eq("lesson_id", lessonId);

  if (error) return { error: "That did not save. Try again." };

  if (lessonSlug) revalidatePath(`/learn/lessons/${lessonSlug}`);
  return { error: null, message: "Saved." };
}

/** One note per lesson. Private, including from staff. */
export async function saveNote(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const lessonId = formData.get("lessonId")?.toString();
  const lessonSlug = formData.get("lessonSlug")?.toString();
  const body = formData.get("body")?.toString() ?? "";

  if (!lessonId) return { error: "That note could not be saved." };
  if (body.length > 10_000) return { error: "That note is too long." };

  const supabase = await createClient();

  if (body.trim() === "") {
    await supabase.from("learner_lesson_notes").delete().eq("lesson_id", lessonId);
    if (lessonSlug) revalidatePath(`/learn/lessons/${lessonSlug}`);
    return { error: null, message: "Note cleared." };
  }

  const { error } = await supabase
    .from("learner_lesson_notes")
    .upsert(
      { profile_id: user.id, lesson_id: lessonId, body },
      { onConflict: "profile_id,lesson_id" },
    );

  if (error) return { error: "That did not save. Try again." };

  if (lessonSlug) revalidatePath(`/learn/lessons/${lessonSlug}`);
  return { error: null, message: "Note saved." };
}
