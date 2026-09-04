"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  applyOptimization,
  dismissRecommendation,
  undoOptimization,
  type ActionSlot,
} from "@/lib/optimize/actions";
import {
  CONFIDENCE_LABELS,
  type Recommendation,
  type RecommendationAction,
} from "@/lib/optimize/types";
import { cn } from "@/lib/utils/cn";

/**
 * One recommendation, and everything a creator needs to decide about it.
 *
 * The order on the card is the order of the questions somebody actually asks:
 * what is this, why does it exist, how sure are you, and what happens if I
 * press the button. The explanation is not a tooltip and the numbers are not
 * behind a help link — the disclosure holds the raw figures, and it is the
 * only thing here that starts closed.
 *
 * Nothing on this card changes the page without a confirmation naming exactly
 * what will change, and nothing that does change it is left without a way
 * back. After an action the card is replaced by a line saying what happened
 * with Undo beside it, which is both the receipt and the escape hatch.
 *
 * The browser sends a key and which of the card's own two buttons was pressed.
 * Every id, position and ordering is re-derived on the server from the
 * creator's own analytics — see `lib/optimize/actions.ts` — so there is no
 * field here that could be edited into an instruction.
 */

const CONFIDENCE_STYLE = {
  high: "bg-success/10 text-success",
  medium: "bg-ink/5 text-ink-muted",
  early: "bg-warning/10 text-warning",
} as const;

const PRIORITY_LABEL = {
  high: "High impact",
  medium: "Worth doing",
  low: "For information",
} as const;

interface Done {
  summary: string;
  undoEventId?: string;
}

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<Done | null>(null);
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary = recommendation.action;
  const secondaries = recommendation.secondary ?? [];

  function undo(eventId: string) {
    setError(null);
    startTransition(async () => {
      const result = await undoOptimization(eventId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setUndone(true);
      router.refresh();
    });
  }

  function dismiss() {
    setError(null);
    startTransition(async () => {
      const result = await dismissRecommendation(recommendation.key);
      if (!result.ok) setError(result.message);
      router.refresh();
    });
  }

  /* ── After the fact ─────────────────────────────────────────────────────── */

  if (done) {
    return (
      <section className="rounded-card border border-border bg-surface p-4" aria-live="polite">
        <p className="text-[0.9375rem] font-medium text-ink">
          {undone ? "Put back." : done.summary}
        </p>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">
          {undone
            ? "Your page is as it was."
            : "Your page has been updated. It may take a moment to appear for visitors."}
        </p>
        {done.undoEventId && !undone ? (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={pending}
            onClick={() => {
              if (done.undoEventId) undo(done.undoEventId);
            }}
          >
            {pending ? "Undoing…" : "Undo"}
          </Button>
        ) : null}
        {error ? <Problem>{error}</Problem> : null}
      </section>
    );
  }

  /* ── The card ───────────────────────────────────────────────────────────── */

  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
            CONFIDENCE_STYLE[recommendation.confidence],
          )}
        >
          {CONFIDENCE_LABELS[recommendation.confidence]}
        </span>
        <span className="text-[0.6875rem] text-ink-subtle">
          {PRIORITY_LABEL[recommendation.priority]}
        </span>
      </div>

      <h3 className="mt-2 text-[0.9375rem] leading-snug font-semibold text-ink">
        {recommendation.title}
      </h3>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
        {recommendation.explanation}
      </p>

      {/* ── The numbers behind it ─────────────────────────────────────────── */}
      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 text-[0.75rem] text-ink-subtle transition-colors hover:text-ink">
          <Chevron className="h-3 w-3" />
          Why this
        </summary>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {recommendation.evidence.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline justify-between gap-3 text-[0.75rem]"
            >
              <dt className="min-w-0 truncate text-ink-subtle">{item.label}</dt>
              <dd className="shrink-0 tabular-nums text-ink-muted">{item.value}</dd>
            </div>
          ))}
        </dl>
      </details>

      {/* ── What you can do ───────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {primary ? (
          primary.kind === "link" ? (
            <ActionLink action={primary} primary />
          ) : (
            <ApplyButton
              recommendationKey={recommendation.key}
              slot="primary"
              action={primary}
              variant="primary"
              onDone={setDone}
              onError={setError}
            />
          )
        ) : null}

        {secondaries.map((secondary) =>
          secondary.kind === "link" ? (
            <ActionLink key={secondary.label} action={secondary} />
          ) : (
            <ApplyButton
              key={secondary.label}
              recommendationKey={recommendation.key}
              slot="secondary"
              action={secondary}
              variant="secondary"
              onDone={setDone}
              onError={setError}
            />
          ),
        )}

        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="ml-auto rounded-control px-2.5 py-1.5 text-[0.8125rem] text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>

      {error ? <Problem>{error}</Problem> : null}
    </section>
  );
}

/* ── A button that changes the page ───────────────────────────────────────── */

/**
 * Owns its own confirmation, which is why it is a component rather than a
 * handler on the card. A card can offer two of these — "Review this link" and
 * "Hide it for now" — and two buttons sharing one dialog is the bug where the
 * second button applies the first button's action.
 */
function ApplyButton({
  recommendationKey,
  slot,
  action,
  variant,
  onDone,
  onError,
}: {
  recommendationKey: string;
  slot: ActionSlot;
  action: Exclude<RecommendationAction, { kind: "link" }>;
  variant: "primary" | "secondary";
  onDone: (done: Done) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const changes = action.kind === "reorder_links" ? action.changes : [];
  const titleId = `confirm-${slot}-${recommendationKey.replace(/[^a-zA-Z0-9-]/g, "-")}`;

  function run() {
    startTransition(async () => {
      const result = await applyOptimization(recommendationKey, slot);
      if (!result.ok) {
        onError(result.message);
        router.refresh();
        return;
      }
      onDone({ summary: result.summary, undoEventId: result.undoEventId });
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        disabled={pending}
        onClick={() => dialog.current?.showModal()}
      >
        {action.label}
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        /*
         * A click on the backdrop lands on the dialog element itself, where a
         * click inside lands on a child — so comparing the target is the whole
         * check and it needs no overlay element of its own.
         */
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className={cn(
          "m-0 mt-auto mb-0 w-full max-w-none rounded-t-[18px] bg-canvas p-0 text-left text-ink",
          "backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]",
          "sm:m-auto sm:max-w-[22rem] sm:rounded-card",
        )}
      >
        <div className="max-h-[80dvh] overflow-y-auto p-5">
          <h2 id={titleId} className="text-[0.9375rem] leading-snug font-semibold text-ink">
            {action.confirm}
          </h2>

          {changes.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-control bg-surface-sunken p-3">
              {changes.map((line) => (
                <li key={line} className="text-[0.8125rem] tabular-nums text-ink-muted">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-[0.8125rem] text-ink-muted">
            You can undo this straight afterwards.
          </p>

          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={() => {
                dialog.current?.close();
                run();
              }}
            >
              {pending ? "Applying…" : "Apply"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function ActionLink({ action, primary = false }: { action: RecommendationAction; primary?: boolean }) {
  if (action.kind !== "link") return null;
  return (
    <Link
      href={action.href}
      className={cn(
        "inline-flex h-9 select-none items-center justify-center rounded-control px-3.5 text-sm font-medium transition-colors",
        primary
          ? "bg-accent text-accent-ink shadow-control hover:bg-accent-hover"
          : "bg-surface text-ink ring-1 ring-border-strong shadow-control hover:bg-surface-sunken",
      )}
    >
      {action.label}
    </Link>
  );
}

const Problem = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
    {children}
  </p>
);

export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("transition-transform group-open:rotate-180", className)}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
