/**
 * The analysis pipeline.
 *
 * Thirteen stages that tick off in order, and eight lines of copy that rotate
 * over them. The point is that the wait shows its work: a stranger's read is
 * being reconstructed step by step, not spun on a wheel.
 *
 * Stage durations are weighted — the cheap detections go quickly, the
 * judgement calls take longer — and sum to `PIPELINE_DURATION_MS`.
 */

export interface Stage {
  id: string;
  label: string;
  /** Relative weight; normalised against the total at runtime. */
  weight: number;
}

export const STAGES: Stage[] = [
  { id: "upload", label: "Screenshot received", weight: 0.5 },
  { id: "isolate", label: "Profile isolated", weight: 0.8 },
  { id: "avatar", label: "Avatar detected", weight: 0.7 },
  { id: "bio", label: "Bio extracted", weight: 0.9 },
  { id: "highlights", label: "Highlights recognised", weight: 0.8 },
  { id: "grid", label: "Grid composition analysed", weight: 1.2 },
  { id: "palette", label: "Colour palette measured", weight: 1 },
  { id: "face", label: "Face positioning detected", weight: 0.9 },
  { id: "balance", label: "Visual balance calculated", weight: 1.1 },
  { id: "readability", label: "Readability measured", weight: 0.9 },
  { id: "consistency", label: "Consistency measured", weight: 1.1 },
  { id: "signals", label: "Social signals identified", weight: 1 },
  { id: "model", label: "Perception model built", weight: 1.3 },
];

export const MESSAGES = [
  "Reading profile hierarchy",
  "Measuring visual clarity",
  "Detecting trust signals",
  "Evaluating authority",
  "Analyzing visual consistency",
  "Understanding social perception",
  "Building your first impression",
  "Generating report",
] as const;

export const PIPELINE_DURATION_MS = 5_000;

const TOTAL_WEIGHT = STAGES.reduce((sum, stage) => sum + stage.weight, 0);

/** Cumulative progress (0–1) at which each stage completes. */
export const STAGE_MARKS: number[] = (() => {
  let running = 0;
  return STAGES.map((stage) => {
    running += stage.weight;
    return running / TOTAL_WEIGHT;
  });
})();

/** Message index for a given progress value, spread evenly across the run. */
export function messageAt(progress: number): number {
  const index = Math.floor(progress * MESSAGES.length);
  return Math.min(index, MESSAGES.length - 1);
}
