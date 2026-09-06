import Link from "next/link";
import { Card, Label } from "@/components/ui/surface";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils/cn";
import type { LearnerPhaseProgressRow } from "@/types/database";

/**
 * The ten phases with real numbers against them.
 *
 * This is the roadmap's data half — `components/lock/roadmap.tsx` still draws
 * the journey, and this draws what has been done inside each stop on it. They
 * are kept separate because the roadmap has to work with no data at all and
 * has since Prompt 2; adding counts to it would have meant rewriting it.
 *
 * `percent === null` is the case that matters and it is not an edge case
 * today: most of the curriculum is unwritten, so most phases have nothing
 * published. Those render "Not published yet" and an empty track. Rendering 0%
 * would claim the learner has done none of ten lessons that do not exist.
 */
export function PhaseProgressList({
  phases,
  currentKey,
}: {
  phases: readonly LearnerPhaseProgressRow[];
  currentKey: string | null;
}) {
  return (
    <Card className="divide-y divide-border">
      {phases.map((phase) => {
        const empty = phase.units_total === 0;
        const done = phase.percent === 100;
        const current = phase.phase_key === currentKey;

        return (
          <div key={phase.phase_key} className="space-y-2 p-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="label text-ink-subtle tabular-nums">
                  {String(phase.position).padStart(2, "0")}
                </span>
                <h3
                  className={cn(
                    "text-[0.9375rem] font-medium",
                    empty ? "text-ink-muted" : "text-ink",
                  )}
                >
                  {phase.label}
                </h3>
                {current ? <span className="label text-accent">In progress</span> : null}
                {done ? <span className="label text-ink-subtle">Complete</span> : null}
              </div>

              <span className="font-mono text-sm tabular-nums text-ink-muted">
                {phase.percent === null ? "—" : `${phase.percent}%`}
              </span>
            </div>

            <ProgressBar
              value={phase.percent}
              max={100}
              label={`${phase.label} progress`}
            />

            <p className="text-sm text-ink-subtle">
              {empty ? (
                "Not published yet."
              ) : (
                <>
                  {phase.lessons_done} of {phase.lessons_total} lessons ·{" "}
                  {phase.missions_done} of {phase.missions_total} missions
                </>
              )}
            </p>
          </div>
        );
      })}
    </Card>
  );
}

/**
 * The one-phase summary, for the dashboard's "where am I".
 *
 * Deliberately answers a different question from the list above: not "how far
 * through everything", but "what am I in the middle of, and what is left in
 * it".
 */
export function CurrentPhase({ phase }: { phase: LearnerPhaseProgressRow }) {
  const lessonsLeft = phase.lessons_total - phase.lessons_done;
  const missionsLeft = phase.missions_total - phase.missions_done;

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="label text-ink-subtle tabular-nums">
            Phase {String(phase.position).padStart(2, "0")}
          </span>
          <h3 className="text-[1.0625rem] font-medium text-ink">{phase.label}</h3>
        </div>
        <p className="max-w-read text-sm text-ink-muted">{phase.summary}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-ink-muted">Progress</span>
          <span className="font-mono text-sm tabular-nums text-ink">
            {phase.percent === null ? "—" : `${phase.percent}%`}
          </span>
        </div>
        <ProgressBar value={phase.percent} max={100} label={`${phase.label} progress`} />
        <p className="text-sm text-ink-subtle">
          {lessonsLeft} {lessonsLeft === 1 ? "lesson" : "lessons"} and {missionsLeft}{" "}
          {missionsLeft === 1 ? "mission" : "missions"} left.
        </p>
      </div>
    </Card>
  );
}

/** A heading with a link through. Repeated on three pages, so it is one thing. */
export function SectionHeading({
  label,
  href,
  linkLabel,
}: {
  label: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <Label as="h2">{label}</Label>
      <Link
        href={href}
        className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
