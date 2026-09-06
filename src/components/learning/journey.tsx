import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { PhaseState } from "@/lib/lock/roadmap";

/**
 * The journey, as one object rather than ten.
 *
 * This is the device the whole learning experience hangs off. Before it, "where
 * am I" was answered by a percentage in a header and a ten-item list further
 * down, which is two facts in two places and neither of them a shape. Ten
 * segments in a row read as a route in one glance: what is behind you is solid,
 * where you are is marked, what is ahead is drawn but quiet.
 *
 * Deliberately not a progress bar. A bar says "72% of a thing"; this says
 * "phase four of ten, and here is what four is called". The distinction is the
 * product's whole claim — the journey is a sequence of different work, not a
 * quantity of the same work.
 */

export interface JourneyPhase {
  key: string;
  number: number;
  label: string;
  state: PhaseState;
  /** Null when the phase has nothing published — never rendered as 0%. */
  percent: number | null;
}

export function JourneyStrip({
  phases,
  activeKey,
  href = "/learn",
}: {
  phases: readonly JourneyPhase[];
  /**
   * The phase to mark. Falls back to whichever is `current`, but is passed
   * explicitly because on day one no phase is current yet and an unmarked strip
   * answers "where am I" with ten identical grey segments.
   */
  activeKey?: string | null;
  /** Where a segment leads. Omit the link on the roadmap, which is already here. */
  href?: string | null;
}) {
  const active =
    phases.find((p) => p.key === activeKey) ?? phases.find((p) => p.state === "current") ?? null;

  return (
    <div className="space-y-3">
      {/*
       * `grid-cols-10` at every width. Ten segments stay ten segments on a
       * phone — the shape *is* the information, and a strip that reflows into
       * three rows stops being a route. The labels drop away below `sm`
       * instead; the numbers and the fill carry it.
       */}
      <ol className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {phases.map((phase) => {
          const done = phase.state === "complete";
          const here = phase.key === active?.key;
          const segment = (
            <>
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  done && "bg-ink",
                  here && "bg-accent",
                  !done && !here && "bg-border",
                )}
              />
              <span
                className={cn(
                  "label mt-2 hidden truncate sm:block",
                  here ? "text-accent" : done ? "text-ink-muted" : "text-ink-subtle",
                )}
              >
                {phase.label}
              </span>
              <span
                className={cn(
                  "label mt-1.5 block tabular-nums sm:hidden",
                  here ? "text-accent" : "text-ink-subtle",
                )}
              >
                {String(phase.number).padStart(2, "0")}
              </span>
            </>
          );

          return (
            <li key={phase.key} className="min-w-0">
              {href ? (
                <Link
                  href={href}
                  aria-label={`Phase ${phase.number}, ${phase.label}`}
                  className="block rounded-sm outline-offset-4"
                >
                  {segment}
                </Link>
              ) : (
                <span aria-label={`Phase ${phase.number}, ${phase.label}`} className="block">
                  {segment}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {active ? (
        <p className="label text-ink-subtle">
          Phase {String(active.number).padStart(2, "0")} of 10 ·{" "}
          <span className="text-ink-muted">{active.label}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * The state of a phase, said in a word and a shape.
 *
 * Four states, and the shape carries them so the meaning survives a monochrome
 * screen: a filled square is done, a ring is where you are, a hollow dot is
 * next, a dash is not yet. Colour only reinforces.
 */
export function PhaseMark({ state }: { state: PhaseState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas",
        state === "current" && "ring-2 ring-accent",
        state === "complete" && "ring-1 ring-ink",
        state === "upcoming" && "ring-1 ring-border-strong",
        state === "locked" && "ring-1 ring-border",
      )}
    >
      {state === "complete" ? (
        <svg viewBox="0 0 16 16" className="size-3 text-ink" fill="none" stroke="currentColor"
             strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.5 3.5L13 4.5" />
        </svg>
      ) : state === "current" ? (
        <span className="size-1.5 rounded-full bg-accent" />
      ) : state === "upcoming" ? (
        <span className="size-1.5 rounded-full bg-border-strong" />
      ) : (
        <span className="h-px w-2 bg-border-strong" />
      )}
    </span>
  );
}

/** How each state is named. One place, so the words never drift. */
export const PHASE_STATE_WORD: Record<PhaseState, string> = {
  complete: "Complete",
  current: "You are here",
  upcoming: "Up next",
  locked: "Later",
};
