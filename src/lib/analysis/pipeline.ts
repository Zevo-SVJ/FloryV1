/**
 * The stages of an analysis, and where each one looks.
 *
 * These are not decoration. Each stage names something the observation stage
 * genuinely reports, in the order a stranger's eye takes the page — which is
 * also the order the model is instructed to work in. The screenshot stays on
 * screen throughout and the band being read moves down it.
 *
 * Bands are ranges rather than boxes on purpose. Every profile client stacks the
 * page the same way — picture and counts, then name and bio, then highlights,
 * then the grid — so a soft horizontal band is true of any screenshot at any
 * aspect ratio. A precise bounding box would be a claim about pixel positions
 * that Blink has not made.
 */

export type RegionKey =
  | "whole"
  | "header"
  | "identity"
  | "highlights"
  | "grid"
  | "palette";

export interface Band {
  /** Fractions of the image's height. */
  from: number;
  to: number;
}

/**
 * Tuned to sit between the two common cases: a full-page phone screenshot, where
 * the grid takes most of the height, and a shorter crop of just the top of the
 * profile. Combined with the feathered veils in `ScreenshotStage`, a band that
 * is a few percent out still reads as attention in the right place.
 */
export const BANDS: Record<RegionKey, Band> = {
  whole: { from: 0, to: 1 },
  header: { from: 0, to: 0.18 },
  identity: { from: 0.12, to: 0.34 },
  highlights: { from: 0.28, to: 0.46 },
  grid: { from: 0.41, to: 1 },
  palette: { from: 0.41, to: 1 },
};

export interface Stage {
  id: string;
  /** The card's own heading. */
  title: string;
  /** One sentence, present tense, about what is happening now. */
  line: string;
  region: RegionKey;
  /** Relative share of the run. Not seconds — the run's length is not ours. */
  weight: number;
}

export const STAGES: readonly Stage[] = [
  {
    id: "read",
    title: "Reading the screenshot",
    line: "Finding the profile in the image, and how much of it is here.",
    region: "whole",
    weight: 1.1,
  },
  {
    id: "avatar",
    title: "The profile picture",
    line: "Judged at the size a stranger sees it: sharpness, framing, whether a face reads at all.",
    region: "header",
    weight: 1.3,
  },
  {
    id: "identity",
    title: "Name and handle",
    line: "Whether the name can be read once and remembered, and whether both agree.",
    region: "identity",
    weight: 1,
  },
  {
    id: "bio",
    title: "The bio",
    line: "Timing how long it takes to say what this account is, and who it is for.",
    region: "identity",
    weight: 1.4,
  },
  {
    id: "highlights",
    title: "Highlights",
    line: "Looking for covers that were designed, and titles that name something.",
    region: "highlights",
    weight: 1,
  },
  {
    id: "grid",
    title: "The grid",
    line: "Mapping the tiles: subject, exposure, framing, whether one hand edited them.",
    region: "grid",
    weight: 1.6,
  },
  {
    id: "palette",
    title: "Colour",
    line: "Sampling the dominant colours, to see whether they behave like a palette or a pile.",
    region: "palette",
    weight: 1.1,
  },
  {
    id: "hierarchy",
    title: "Attention",
    line: "Which element wins the first glance, and how many are fighting for it.",
    region: "whole",
    weight: 1.2,
  },
  {
    id: "perception",
    title: "The impression",
    line: "Turning all of it into the sentence a stranger would say about you.",
    region: "whole",
    weight: 1.8,
  },
] as const;

/**
 * How long a run is expected to take.
 *
 * Two model passes at high effort. The deck is paced against this estimate and
 * holds on the last card when the run is slower, rather than claiming to have
 * finished something that has not finished.
 */
export const ESTIMATED_MS = 38_000;

/** The sample run is not pretending to be slow; it is paced to be read. */
export const SAMPLE_MS = 7_600;

const TOTAL_WEIGHT = STAGES.reduce((sum, stage) => sum + stage.weight, 0);

/** Cumulative fraction of the run at which each stage begins. */
export const STAGE_STARTS: readonly number[] = (() => {
  const starts: number[] = [];
  let carried = 0;
  for (const stage of STAGES) {
    starts.push(carried / TOTAL_WEIGHT);
    carried += stage.weight;
  }
  return starts;
})();

/** Which stage a progress fraction falls in. */
export function stageAt(progress: number): number {
  let index = 0;
  for (let i = 0; i < STAGE_STARTS.length; i += 1) {
    if (progress >= STAGE_STARTS[i]!) index = i;
  }
  return index;
}
