"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreRecommendation, undoOptimization } from "@/lib/optimize/actions";
import type { OptimizationEvent } from "@/lib/optimize/queries";

/**
 * What Smart Optimization has changed, and how to change it back.
 *
 * A list, not a version-control system. The objective is transparency about
 * one thing — which of these recommendations a creator actually took, and
 * when — and a full history of every row on the page would be a much larger
 * thing to build and a much harder thing to read.
 *
 * Undo appears next to anything applied that has not been undone yet, and it
 * stays there rather than expiring after a few seconds: a creator who reorders
 * their links and looks at the page for a minute before deciding they preferred
 * it the old way should not have lost the option by looking.
 */
export function History({ events }: { events: OptimizationEvent[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <p className="py-4 text-[0.8125rem] text-ink-subtle">
        Nothing yet. Recommendations you apply or dismiss will be listed here.
      </p>
    );
  }

  function undo(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await undoOptimization(id);
      if (!result.ok) setError(result.message);
      router.refresh();
    });
  }

  function restore(key: string) {
    setError(null);
    startTransition(async () => {
      const result = await restoreRecommendation(key);
      if (!result.ok) setError(result.message);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {events.map((event) => (
          <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
            <time
              dateTime={event.createdAt}
              className="w-16 shrink-0 text-[0.75rem] tabular-nums text-ink-subtle"
            >
              {formatDay(event.createdAt)}
            </time>

            <span className="min-w-0 flex-1 text-[0.8125rem] text-ink">
              {event.kind === "dismissed" ? `Dismissed — ${event.summary}` : event.summary}
              {event.undoneAt ? (
                <span className="text-ink-subtle"> · undone</span>
              ) : null}
            </span>

            {event.kind === "applied" && event.undoable ? (
              <button
                type="button"
                onClick={() => undo(event.id)}
                disabled={pending}
                className="shrink-0 rounded-control px-2 py-1 text-[0.75rem] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
              >
                Undo
              </button>
            ) : null}

            {event.kind === "dismissed" ? (
              <button
                type="button"
                onClick={() => restore(event.recommendationKey)}
                disabled={pending}
                className="shrink-0 rounded-control px-2 py-1 text-[0.75rem] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
              >
                Show again
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
