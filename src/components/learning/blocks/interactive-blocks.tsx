"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/cn";
import { submitBlockResponse } from "@/lib/learning/actions";
import { emptyResponseState } from "@/lib/learning/action-state";
import type { LearnerBlockResponseRow } from "@/types/database";

/**
 * The blocks that ask for something.
 *
 * Every one follows the same loop: **commit before reveal**.
 *
 * These components never receive the reveal, the explanation or the answer key.
 * They take the question and the options, and the server passes an already
 * rendered `reveal` node — null until a response exists in the database. That
 * shape is the fix for a real fault: a Client Component's props are serialized
 * into the page, so passing the whole block object put every explanation and
 * every `correct` array into the HTML of a lesson nobody had answered yet. It
 * was verified in a browser, and it was leaking.
 *
 * What this guarantees: the reveal is not in the document until it is earned.
 * What it does not: `lessons.blocks` is still readable through the API by any
 * signed-in account, so a determined learner with the network tab open can find
 * an answer key. Closing that needs the graded fields split out of the row —
 * a column-level grant or a view — and it is a deliberate deferral rather than
 * an oversight. Casual leakage is what was worth fixing; LOCK is a private tool
 * whose learner is the person it is for.
 */

interface Shared {
  blockId: string;
  lessonId: string;
  lessonSlug: string;
  saved?: LearnerBlockResponseRow;
  /** Rendered on the server. Null until the learner has answered. */
  reveal?: ReactNode;
}

/* ── The frame every interactive block shares ────────────────────────────── */

/**
 * The moment the reading stops.
 *
 * A full border made these look like every other block on the page, which is
 * the opposite of the job: an active-learning prompt has to read as an
 * *interruption*. So it loses the box and gains a heavy accent rule down the
 * left, sits on a tinted ground, and is set wider than the prose it breaks
 * into — the eye registers the change of shape before it reads the label.
 */
function Prompt({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-l-[3px] border-accent bg-accent-quiet/30 py-5 pr-5 pl-6">
      <p className="label mb-3 text-accent">{label}</p>
      {children}
    </div>
  );
}

function Reveal({ label = "What LOCK would look for", children }: { label?: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-accent/30 pt-4">
      <p className="label mb-2 text-ink-subtle">{label}</p>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

function Submit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending || undefined} className={className}>
      {pending ? <Spinner /> : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Hidden({ lessonId, lessonSlug, blockId }: { lessonId: string; lessonSlug: string; blockId: string }) {
  return (
    <>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="lessonSlug" value={lessonSlug} />
      <input type="hidden" name="blockId" value={blockId} />
    </>
  );
}

function Verdict({ correct }: { correct: boolean }) {
  return (
    <p
      role="status"
      className={cn("label mt-3", correct ? "text-success" : "text-danger")}
    >
      {correct ? "Correct" : "Not quite — read the explanation and try again"}
    </p>
  );
}

/* ── Graded questions ────────────────────────────────────────────────────── */

/**
 * Multiple choice, single or multiple answer.
 *
 * Native radios and checkboxes, not styled `div`s with click handlers. Arrow
 * keys move within a radio group, space toggles a checkbox, the label is
 * clickable and a screen reader announces the group and the state — all of it
 * free, and none of it reliably reimplemented.
 */
export function ChoiceBlock({
  blockId, question, multiple, options, lessonId, lessonSlug, saved, reveal,
}: Shared & {
  question: string;
  multiple: boolean;
  options: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(submitBlockResponse, emptyResponseState);
  const answered = state.answered || saved !== undefined;
  const correct = state.answered ? state.correct : saved?.is_correct;
  const previous = extractArray(saved?.response);

  return (
    <form action={formAction}>
      <Prompt label={multiple ? "Check your understanding · choose all that apply" : "Check your understanding"}>
        <Hidden lessonId={lessonId} lessonSlug={lessonSlug} blockId={blockId} />

        <fieldset>
          <legend className="mb-4 text-[0.9375rem] font-medium text-ink">{question}</legend>
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-[0.9375rem] text-ink-muted transition-colors hover:bg-surface-sunken has-checked:text-ink"
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name="value"
                  value={option.id}
                  defaultChecked={previous.includes(option.id)}
                  className="size-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.error ? <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p> : null}
        {typeof correct === "boolean" ? <Verdict correct={correct} /> : null}

        <div className="mt-4">
          <Submit label={answered ? "Answer again" : "Submit answer"} />
        </div>

        {reveal}
      </Prompt>
    </form>
  );
}

export function BooleanBlock({
  blockId, question, lessonId, lessonSlug, saved, reveal,
}: Shared & { question: string }) {
  const [state, formAction] = useActionState(submitBlockResponse, emptyResponseState);
  const answered = state.answered || saved !== undefined;
  const correct = state.answered ? state.correct : saved?.is_correct;
  const previous = extractArray(saved?.response);

  return (
    <form action={formAction}>
      <Prompt label="True or false">
        <Hidden lessonId={lessonId} lessonSlug={lessonSlug} blockId={blockId} />

        <fieldset>
          <legend className="mb-4 text-[0.9375rem] font-medium text-ink">{question}</legend>
          <div className="flex flex-wrap gap-2">
            {(["true", "false"] as const).map((value) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-border px-4 text-[0.9375rem] text-ink-muted transition-colors hover:bg-surface-sunken has-checked:border-accent has-checked:text-ink"
              >
                <input
                  type="radio"
                  name="value"
                  value={value}
                  defaultChecked={previous.includes(value)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <span className="capitalize">{value}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.error ? <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p> : null}
        {typeof correct === "boolean" ? <Verdict correct={correct} /> : null}

        <div className="mt-4">
          <Submit label={answered ? "Answer again" : "Submit answer"} />
        </div>

        {reveal}
      </Prompt>
    </form>
  );
}

/**
 * Ordering, as a list of position selects.
 *
 * Not drag-and-drop. A drag interaction that works with a keyboard, a screen
 * reader and a thumb is a week of work and a dependency; a select per item is
 * understood by everything and is honestly easier to use on a phone.
 */
export function OrderingBlock({
  blockId, question, items, lessonId, lessonSlug, saved, reveal,
}: Shared & { question: string; items: { id: string; label: string }[] }) {
  const [state, formAction] = useActionState(submitBlockResponse, emptyResponseState);
  const answered = state.answered || saved !== undefined;
  const correct = state.answered ? state.correct : saved?.is_correct;

  return (
    <form action={formAction}>
      <Prompt label="Put these in order">
        <Hidden lessonId={lessonId} lessonSlug={lessonSlug} blockId={blockId} />
        <p className="mb-4 text-[0.9375rem] font-medium text-ink">{question}</p>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <label className="sr-only" htmlFor={`${blockId}-${item.id}`}>
                Position for {item.label}
              </label>
              <select
                id={`${blockId}-${item.id}`}
                name="value"
                defaultValue={item.id}
                className="h-11 rounded-control border border-border bg-surface px-2 text-sm text-ink"
              >
                {items.map((_, position) => (
                  <option key={position} value={item.id}>
                    {position + 1}
                  </option>
                ))}
              </select>
              <span className="text-[0.9375rem] text-ink-muted">{item.label}</span>
            </div>
          ))}
        </div>

        {state.error ? <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p> : null}
        {typeof correct === "boolean" ? <Verdict correct={correct} /> : null}

        <div className="mt-4">
          <Submit label={answered ? "Answer again" : "Submit order"} />
        </div>

        {reveal}
      </Prompt>
    </form>
  );
}

/* ── Ungraded: judgement, prediction, reflection ─────────────────────────── */

/**
 * "What would you do?" — the judgement block.
 *
 * Every option shows its tradeoff before the learner picks, because the
 * tradeoffs *are* the lesson. Nothing is marked right: the reveal names what
 * LOCK would choose and why, and a learner who chose otherwise for a good
 * reason has done the exercise correctly.
 */
export function DecisionBlock({
  blockId, situation, options, lessonId, lessonSlug, saved, reveal,
}: Shared & {
  situation: string;
  options: { id: string; label: string; tradeoff: string }[];
}) {
  const [state, formAction] = useActionState(submitBlockResponse, emptyResponseState);
  const answered = state.answered || saved !== undefined;
  const chosen = extractString(saved?.response);

  return (
    <form action={formAction}>
      <Prompt label="What would you do?">
        <Hidden lessonId={lessonId} lessonSlug={lessonSlug} blockId={blockId} />
        <p className="mb-4 text-[0.9375rem] leading-relaxed text-ink">{situation}</p>

        <fieldset>
          <legend className="sr-only">Choose an option</legend>
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer gap-3 rounded-control border border-border p-3 transition-colors hover:bg-surface-sunken has-checked:border-accent"
              >
                <input
                  type="radio"
                  name="text"
                  value={option.id}
                  defaultChecked={chosen === option.id}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="block text-[0.9375rem] font-medium text-ink">{option.label}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{option.tradeoff}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.error ? <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p> : null}

        <div className="mt-4">
          <Submit label={answered ? "Change my decision" : "Commit to this"} />
        </div>

        {reveal}
      </Prompt>
    </form>
  );
}

/**
 * Every written answer: predict, your move, reflection, short answer.
 *
 * One component for four blocks, because they differ by their labels and
 * whether a reveal follows. Four near-identical textareas would drift apart.
 */
export function OpenPromptBlock({
  blockId, label, situation, question, guidance, submitLabel,
  lessonId, lessonSlug, saved, reveal,
}: Shared & {
  label: string;
  situation?: string;
  question: string;
  guidance?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(submitBlockResponse, emptyResponseState);
  const previous = extractString(saved?.response);
  const answered = state.answered || previous !== null;
  const [draft, setDraft] = useState(previous ?? "");

  return (
    <form action={formAction}>
      <Prompt label={label}>
        <Hidden lessonId={lessonId} lessonSlug={lessonSlug} blockId={blockId} />

        {situation ? (
          <p className="mb-4 text-[0.9375rem] leading-relaxed text-ink">{situation}</p>
        ) : null}

        <label htmlFor={`${blockId}-text`} className="block text-[0.9375rem] font-medium text-ink">
          {question}
        </label>
        {guidance ? <p className="mt-1 text-sm text-ink-subtle">{guidance}</p> : null}

        <textarea
          id={`${blockId}-text`}
          name="text"
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="mt-3 w-full rounded-control bg-surface px-3.5 py-3 text-[0.9375rem] text-ink ring-1 ring-border-strong transition-shadow placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-none"
          placeholder="Write your answer before reading on."
        />

        {state.error ? <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Submit label={answered ? "Update" : submitLabel} />
          {answered && !state.error ? (
            <span role="status" className="label text-ink-subtle">Saved</span>
          ) : null}
        </div>

        {reveal}
      </Prompt>
    </form>
  );
}

/** The reveal itself, rendered on the server and passed in as a node. */
export { Reveal };

/* ── Reading back what the database stored ───────────────────────────────── */

/*
 * The response column is JSONB, so it arrives as `unknown`. These narrow it
 * without trusting it: a row written by an older version of a block, or by
 * hand, must not throw inside a render.
 */

function extractArray(response: unknown): string[] {
  if (typeof response !== "object" || response === null) return [];
  const value = (response as { value?: unknown }).value;
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function extractString(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const value = (response as { value?: unknown }).value;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}
