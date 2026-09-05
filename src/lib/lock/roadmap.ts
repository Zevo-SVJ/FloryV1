import { PHASES, type Phase, type PhaseKey } from "@/lib/lock/phases";

/**
 * The roadmap's state vocabulary, and the function that assigns it.
 *
 * Four states, because a route through ten phases has four meaningful positions
 * relative to where you stand: behind you, under your feet, next, and not yet
 * reachable. The interface needs all four to be legible before there is any
 * data to put in them — otherwise the learning engine arrives and has to design
 * the roadmap as well as populate it.
 *
 * `buildRoadmap(null)` is the honest state today: nothing is recorded, so every
 * phase is simply ahead. It does *not* mark phase one as current. Nobody has
 * started anything, and a product that decides on your behalf that you are
 * mid-way through Think is a product that lies in its first sentence.
 *
 * Prompt 3 supplies a real `RoadmapProgress` from Supabase and nothing here or
 * in the component changes.
 */

export type PhaseState = "complete" | "current" | "upcoming" | "locked";

export interface RoadmapPhase extends Phase {
  state: PhaseState;
}

export interface RoadmapProgress {
  /** Phases finished, in any order. */
  completed: readonly PhaseKey[];
  /** The one being worked on, or null between phases. */
  current: PhaseKey | null;
}

export function buildRoadmap(progress: RoadmapProgress | null): RoadmapPhase[] {
  if (!progress) {
    return PHASES.map((phase) => ({ ...phase, state: "upcoming" as const }));
  }

  const completed = new Set(progress.completed);
  const currentNumber =
    PHASES.find((phase) => phase.key === progress.current)?.number ?? null;

  return PHASES.map((phase) => ({ ...phase, state: stateFor(phase, completed, currentNumber) }));
}

function stateFor(
  phase: Phase,
  completed: Set<PhaseKey>,
  currentNumber: number | null,
): PhaseState {
  if (completed.has(phase.key)) return "complete";
  if (currentNumber !== null && phase.number === currentNumber) return "current";

  /*
   * One phase ahead is reachable; everything past that is not. That is the
   * program's own rule — LOCK is a sequence, and letting somebody open Monetize
   * on their first day would be letting them skip the work that makes it mean
   * anything. With no current phase, the first unfinished one is what is open.
   */
  const nextNumber = currentNumber !== null ? currentNumber + 1 : firstUnfinished(completed);
  return phase.number === nextNumber ? "upcoming" : "locked";
}

const firstUnfinished = (completed: Set<PhaseKey>): number =>
  PHASES.find((phase) => !completed.has(phase.key))?.number ?? PHASES.length + 1;

/** How each state is named in the interface. One place, so the words never drift. */
export const PHASE_STATE_LABEL: Record<PhaseState, string> = {
  complete: "Complete",
  current: "In progress",
  upcoming: "Next up",
  locked: "Locked",
};
