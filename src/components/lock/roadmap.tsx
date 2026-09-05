import { Card } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";
import { PHASE_STATE_LABEL, type PhaseState, type RoadmapPhase } from "@/lib/lock/roadmap";

/**
 * The ten phases, as a route rather than a list.
 *
 * A single column with a rule running down it, numbers in the monospace, and
 * one marker per phase. The rule is what makes it read as a journey — remove it
 * and this is a table of contents.
 *
 * The state is carried by the marker and by one word, never by colour alone:
 * the four markers are a tick, a filled dot, an outline dot and a dash, so the
 * difference survives a monochrome screen and colour blindness. The accent
 * appears exactly once, on the phase you are in.
 */
export function Roadmap({ phases }: { phases: RoadmapPhase[] }) {
  return (
    <ol className="relative space-y-px">
      {/* The rule. Behind the markers, stopping at the last one rather than
          running off the end of the list. */}
      <span aria-hidden className="absolute top-6 bottom-6 left-[0.9375rem] w-px bg-border" />

      {phases.map((phase) => (
        <li key={phase.key} className="relative">
          <div className="flex gap-4 px-1 py-3">
            <Marker state={phase.state} />

            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="label text-ink-subtle tabular-nums">
                  {String(phase.number).padStart(2, "0")}
                </span>
                <h3
                  className={cn(
                    "text-[0.9375rem] font-medium",
                    phase.state === "locked" ? "text-ink-muted" : "text-ink",
                  )}
                >
                  {phase.label}
                </h3>
                <span
                  className={cn(
                    "label",
                    phase.state === "current" ? "text-accent" : "text-ink-subtle",
                  )}
                >
                  {PHASE_STATE_LABEL[phase.state]}
                </span>
              </div>

              <p className="text-sm text-ink-muted">{phase.summary}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The dot on the rule.
 *
 * Shape carries the meaning; colour only reinforces it. `bg-canvas` on every
 * marker so the rule behind does not show through the middle.
 */
function Marker({ state }: { state: PhaseState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 mt-0.5 flex size-[1.875rem] shrink-0 items-center justify-center rounded-full",
        "bg-canvas ring-1",
        state === "complete" && "ring-ink",
        state === "current" && "ring-2 ring-accent",
        state === "upcoming" && "ring-border-strong",
        state === "locked" && "ring-border",
      )}
    >
      {state === "complete" ? (
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 text-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8.5l3.5 3.5L13 4.5" />
        </svg>
      ) : state === "current" ? (
        <span className="size-2 rounded-full bg-accent" />
      ) : state === "upcoming" ? (
        <span className="size-2 rounded-full bg-border-strong" />
      ) : (
        <span className="h-px w-2.5 bg-border-strong" />
      )}
    </span>
  );
}

/**
 * The key to the markers.
 *
 * Worth drawing while every phase is `upcoming`: it shows the vocabulary the
 * roadmap will use without pretending any of it applies yet. It is a legend,
 * not data.
 */
export function RoadmapLegend() {
  const states: PhaseState[] = ["complete", "current", "upcoming", "locked"];

  return (
    <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
      {states.map((state) => (
        <div key={state} className="flex items-center gap-2">
          <Marker state={state} />
          <span className="label text-ink-muted">{PHASE_STATE_LABEL[state]}</span>
        </div>
      ))}
    </Card>
  );
}
