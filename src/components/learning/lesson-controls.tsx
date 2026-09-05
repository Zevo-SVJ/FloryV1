"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/cn";
import { completeLesson, saveNote, setConfidence } from "@/lib/learning/actions";
import { emptyLessonState } from "@/lib/learning/action-state";
import { COMPLETION_HINT, CONFIDENCE_LABEL } from "@/lib/learning/labels";
import type { CompletionRule, ConfidenceLevel } from "@/types/database";

/**
 * The three controls that close a lesson.
 *
 * All three are forms posting to Server Actions. None of them decides anything:
 * completion is refused or granted by `complete_lesson()` in the database, and
 * the message here just says what came back in the lesson's own language.
 */

export function CompletionControl({
  lessonId,
  lessonSlug,
  rule,
  completed,
}: {
  lessonId: string;
  lessonSlug: string;
  rule: CompletionRule;
  completed: boolean;
}) {
  const [state, formAction] = useActionState(completeLesson, emptyLessonState);

  if (completed) {
    return (
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2 rounded-full bg-success" />
        <p className="text-sm text-ink">Completed</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="lessonSlug" value={lessonSlug} />

      <p className="text-sm text-ink-muted">{COMPLETION_HINT[rule]}</p>

      <Finish disabled={rule === "practical"} />

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Finish({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? <Spinner /> : null}
      {pending ? "Saving…" : "Mark lesson complete"}
    </Button>
  );
}

/**
 * How well it landed, in the learner's own judgement.
 *
 * Three buttons rather than a slider or a star rating. The question is not "how
 * good was this lesson" but "do you need to come back to it", and three answers
 * is the most that question has. `revisit` is what the Revisit list reads.
 */
export function ConfidenceControl({
  lessonId,
  lessonSlug,
  current,
}: {
  lessonId: string;
  lessonSlug: string;
  current: ConfidenceLevel | null;
}) {
  const [state, formAction] = useActionState(setConfidence, emptyLessonState);
  const levels: ConfidenceLevel[] = ["solid", "shaky", "revisit"];

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="lessonSlug" value={lessonSlug} />

      <p className="label text-ink-subtle">How well did this land?</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {levels.map((level) => (
          <button
            key={level}
            type="submit"
            name="confidence"
            value={level}
            aria-pressed={current === level}
            className={cn(
              "min-h-11 rounded-control border px-3 text-left text-sm transition-colors sm:text-center",
              current === level
                ? "border-accent bg-accent-quiet text-ink"
                : "border-border text-ink-muted hover:bg-surface-sunken hover:text-ink",
            )}
          >
            {CONFIDENCE_LABEL[level]}
          </button>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * One private note per lesson.
 *
 * Private from staff too, by policy rather than by convention — a note is
 * thinking out loud, and a learner who knows a mentor reads it writes a
 * different note. Submitted work is a separate thing, and it is Prompt 4's.
 */
export function NotePanel({
  lessonId,
  lessonSlug,
  note,
}: {
  lessonId: string;
  lessonSlug: string;
  note: string | null;
}) {
  const [state, formAction] = useActionState(saveNote, emptyLessonState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="lessonSlug" value={lessonSlug} />

      <label htmlFor="lesson-note" className="label block text-ink-subtle">
        Your notes
      </label>

      <textarea
        id="lesson-note"
        name="body"
        rows={5}
        defaultValue={note ?? ""}
        maxLength={10000}
        placeholder="Only you can read this."
        className="w-full rounded-control bg-surface px-3.5 py-3 text-sm text-ink ring-1 ring-border-strong transition-shadow placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-3">
        <SaveNote />
        {state.message ? (
          <span role="status" className="text-sm text-success">
            {state.message}
          </span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function SaveNote() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save note"}
    </Button>
  );
}
