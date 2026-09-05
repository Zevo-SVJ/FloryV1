import type {
  LearnerActivityRow,
  LearnerPhaseProgressRow,
  LearnerSkillStateRow,
  SkillState,
} from "@/types/database";
import { SKILL_STATE_RANK } from "@/lib/progress/labels";
import type { PhaseKey } from "@/lib/lock/phases";
import type { RoadmapProgress } from "@/lib/lock/roadmap";

/**
 * The progress rules, stated once so that every screen agrees.
 *
 * Section 18 of the brief asks that progress be deterministic and explainable,
 * and that the weights be written down rather than implied. They are, in two
 * places and only two: the `learner_phase_progress` view computes them in SQL,
 * and the constants below name the same numbers for the interface to *show*
 * the rule to the learner. Nothing here recomputes a percentage — a second
 * implementation is a second answer, and the whole point is that there is one.
 */

/** A lesson is one unit of a phase. */
export const LESSON_WEIGHT = 1;

/**
 * A mission is three.
 *
 * The ratio is the product's opinion about what learning is: a phase is mostly
 * the work, not the reading. It lives in the view; this constant exists so the
 * progress page can say so out loud rather than leaving a percentage
 * unexplained.
 */
export const MISSION_WEIGHT = 3;

/** The sentence the progress page prints under the global bar. */
export const PROGRESS_RULE =
  `Progress counts published work only. A lesson is worth ${LESSON_WEIGHT} and a ` +
  `mission ${MISSION_WEIGHT}, because a phase is mostly the building. A phase ` +
  `with nothing published yet has no percentage at all, rather than zero.`;

/**
 * Where the learner is, from the phase rows.
 *
 * The current phase is the earliest one that is started and unfinished —
 * earliest rather than most recent, because LOCK is a sequence and going back
 * to an unfinished earlier phase is the right answer to "where am I". A phase
 * nobody has touched is ahead of you, not under your feet, which is the same
 * rule `deriveRoadmapProgress` has applied since Prompt 3.
 */
export function roadmapFromPhases(rows: readonly LearnerPhaseProgressRow[]): RoadmapProgress {
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  const completed: PhaseKey[] = [];
  let current: PhaseKey | null = null;

  for (const row of ordered) {
    if (row.units_total === 0) continue;
    if (row.percent === 100) {
      completed.push(row.phase_key as PhaseKey);
    } else if (current === null && row.units_done > 0) {
      current = row.phase_key as PhaseKey;
    }
  }

  return { completed, current };
}

/**
 * The phase to point somebody at.
 *
 * The one in progress if there is one; otherwise the first with published
 * content that is not finished. Null when nothing is published anywhere, which
 * is the honest state of a curriculum still being written — and every surface
 * renders it as "nothing published yet" rather than as phase one.
 */
export function focusPhase(
  rows: readonly LearnerPhaseProgressRow[],
): LearnerPhaseProgressRow | null {
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  const started = ordered.find(
    (row) => row.units_total > 0 && row.units_done > 0 && row.percent !== 100,
  );
  if (started) return started;
  return ordered.find((row) => row.units_total > 0 && row.percent !== 100) ?? null;
}

/** Skills at `demonstrated` or better, strongest first. */
export function demonstratedSkills(
  rows: readonly LearnerSkillStateRow[],
): LearnerSkillStateRow[] {
  return rows
    .filter((row) => SKILL_STATE_RANK[row.state] >= SKILL_STATE_RANK.demonstrated)
    .sort((a, b) => SKILL_STATE_RANK[b.state] - SKILL_STATE_RANK[a.state]);
}

/**
 * The skills worth showing on a dashboard: the ones actually moving.
 *
 * Ordered by how far along they are, then by how recently the evidence
 * arrived. Anything at `not_started` is excluded — a dashboard listing
 * capabilities somebody has no evidence for would be the opposite of the
 * point.
 */
export function movingSkills(
  rows: readonly LearnerSkillStateRow[],
  limit = 4,
): LearnerSkillStateRow[] {
  return rows
    .filter((row) => row.state !== "not_started")
    .sort((a, b) => {
      const byState = SKILL_STATE_RANK[b.state] - SKILL_STATE_RANK[a.state];
      if (byState !== 0) return byState;
      return (b.last_evidence_at ?? "").localeCompare(a.last_evidence_at ?? "");
    })
    .slice(0, limit);
}

/** How much of the five-state meter a skill fills, 0–1. */
export const skillFraction = (state: SkillState): number =>
  SKILL_STATE_RANK[state] / 4;

/**
 * Newest first, and never trusting the database's ordering.
 *
 * `learner_activity` is three unioned selects; a `union all` has no defined
 * order, so sorting here is required rather than defensive.
 */
export function sortActivity(rows: readonly LearnerActivityRow[]): LearnerActivityRow[] {
  return [...rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}
