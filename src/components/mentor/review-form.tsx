"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";
import { answerQuestion, reviewArtifact, saveMentorNote } from "@/lib/mentor/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";
import {
  DECISION_LABEL, FEEDBACK_CATEGORY_LABEL, REVIEW_DECISIONS, type ReviewDecision,
} from "@/lib/mentor/labels";
import type { FeedbackCategory } from "@/types/database";

/**
 * The review panel.
 *
 * The decision comes first and the fields follow, because choosing between
 * "approve" and "needs work" is the whole judgement and everything after it is
 * explaining that judgement to somebody who has to act on it.
 *
 * Four fields, not a comment box. "Looks good" is the failure this shape exists
 * to prevent: a mentor who writes it teaches nothing, and a learner who reads
 * it learns nothing. On a `needs work` verdict the last two are required —
 * checked here for a readable message, and again in the database, which is the
 * guarantee.
 */
export function ReviewForm({ artifactId }: { artifactId: string }) {
  const [state, formAction] = useActionState(reviewArtifact, emptyWorkspaceState);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);

  const returning = decision === "needs_work";

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="artifactId" value={artifactId} />

        <fieldset>
          <legend className="label mb-3 text-ink-subtle">Decision</legend>
          <div className="flex flex-col gap-2 sm:flex-row">
            {REVIEW_DECISIONS.map((candidate) => (
              <label
                key={candidate}
                className={cn(
                  "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border px-3 text-sm transition-colors",
                  decision === candidate
                    ? "border-accent bg-accent-quiet text-ink"
                    : "border-border text-ink-muted hover:bg-surface-sunken hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={candidate}
                  checked={decision === candidate}
                  onChange={() => setDecision(candidate)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                {DECISION_LABEL[candidate]}
              </label>
            ))}
          </div>
        </fieldset>

        <Area
          name="whatWorks"
          label="What works"
          hint="Name the specific thing, not the effort. Praise that could apply to anything teaches nothing."
        />
        <Area
          name="whatNeedsWork"
          label="What needs work"
          hint={returning ? "Required. What is weak or missing." : "What is weak or missing."}
          required={returning}
        />
        <Area
          name="why"
          label="Why it matters"
          hint="The consequence. This is the part that changes how they decide next time."
        />
        <Area
          name="nextStep"
          label="Next step"
          hint={
            returning
              ? "Required. One concrete thing to do — not a list, and not the answer."
              : "One concrete thing to do next."
          }
          required={returning}
        />

        <div className="space-y-1.5">
          <label htmlFor="review-category" className="block text-sm font-medium text-ink">
            Category
          </label>
          <select
            id="review-category"
            name="category"
            defaultValue="other"
            className="h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-ink sm:w-auto"
          >
            {(Object.keys(FEEDBACK_CATEGORY_LABEL) as FeedbackCategory[]).map((category) => (
              <option key={category} value={category}>
                {FEEDBACK_CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
        </div>

        <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
          You are not here to do the work. A good next step points at the
          question they have not asked, not at the code they should paste.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Submit disabled={decision === null} />
          {state.message ? (
            <span role="status" className="text-sm text-success">{state.message}</span>
          ) : null}
          {state.error ? (
            <span role="alert" className="text-sm text-danger">{state.error}</span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function Area({
  name,
  label,
  hint,
  required,
}: {
  name: string;
  label: string;
  hint: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`review-${name}`} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <p className="text-sm text-ink-subtle">{hint}</p>
      <textarea
        id={`review-${name}`}
        name={name}
        rows={3}
        required={required}
        className="w-full rounded-control bg-surface px-3.5 py-3 text-[0.9375rem] text-ink ring-1 ring-border-strong focus:ring-2 focus:ring-accent focus:outline-none"
      />
    </div>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? <Spinner /> : null}
      {pending ? "Recording…" : "Record review"}
    </Button>
  );
}

/**
 * A private note about the learner.
 *
 * Imported directly rather than lazily: a Server Action has to be a statically
 * known reference for the framework to give it an endpoint, and a dynamic
 * import returns a promise the form cannot post to.
 */
export function NoteForm({ learnerId }: { learnerId: string }) {
  const [state, formAction] = useActionState(saveMentorNote, emptyWorkspaceState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="learnerId" value={learnerId} />
      {/* A real `label`, as in `AnswerForm` below. The styled paragraph looked
          like one and named nothing. */}
      <label htmlFor="mentor-note" className="label block text-ink-subtle">
        Private note
      </label>
      <p id="mentor-note-hint" className="text-sm text-ink-subtle">
        Only you see this. Context you will want in three missions&rsquo; time.
      </p>
      <textarea
        id="mentor-note"
        aria-describedby="mentor-note-hint"
        name="body"
        rows={3}
        maxLength={5000}
        placeholder="Strong product instinct. Stops gathering evidence one conversation early."
        className="w-full rounded-control bg-surface px-3.5 py-3 text-sm text-ink ring-1 ring-border-strong focus:ring-2 focus:ring-accent focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <SmallSubmit label="Save note" />
        {state.message ? (
          <span role="status" className="text-sm text-success">{state.message}</span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-sm text-danger">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}

function SmallSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

/** Answering a question, beside the question it answers. */
export function AnswerForm({
  questionId,
  learnerId,
}: {
  questionId: string;
  learnerId: string;
}) {
  const [state, formAction] = useActionState(answerQuestion, emptyWorkspaceState);

  return (
    <form action={formAction} className="space-y-3 border-t border-border pt-4">
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="learnerId" value={learnerId} />

      <label htmlFor={`answer-${questionId}`} className="block text-sm font-medium text-ink">
        Your answer
      </label>
      <p className="text-sm text-ink-subtle">
        Help them think. An answer that hands over the solution costs them the
        judgement the question was worth.
      </p>
      <textarea
        id={`answer-${questionId}`}
        name="response"
        rows={3}
        className="w-full rounded-control bg-surface px-3.5 py-3 text-sm text-ink ring-1 ring-border-strong focus:ring-2 focus:ring-accent focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-3">
        <SmallSubmit label="Send answer" />
        {state.message ? (
          <span role="status" className="text-sm text-success">{state.message}</span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-sm text-danger">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
