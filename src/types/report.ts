/**
 * The perception report contract.
 *
 * This is the boundary between the interface and whatever produces the
 * analysis. Everything the UI renders comes from this shape, so the source can
 * change — vision model, cached record, sample — without anything above it
 * noticing.
 */

export type MetricKey =
  | "firstImpression"
  | "trust"
  | "authority"
  | "visualQuality"
  | "profileClarity"
  | "profileConsistency"
  | "memorability"
  | "socialPresence";

export const METRIC_ORDER: readonly MetricKey[] = [
  "firstImpression",
  "trust",
  "authority",
  "visualQuality",
  "profileClarity",
  "profileConsistency",
  "memorability",
  "socialPresence",
];

export interface Metric {
  key: MetricKey;
  label: string;
  score: number;
  /** What Blink saw on this profile. Observation, not judgement. */
  detected: string;
  /** Why this dimension changes whether someone follows. Fixed per metric. */
  whyItMatters: string;
  /** The specific thing here holding the score down. */
  whatLowersIt: string;
  /** One instruction, carryable this afternoon. */
  howToImprove: string;
  /** What changes for a stranger once it is done. */
  expectedImpact: string;
}

export interface Action {
  title: string;
  detail: string;
  /** Honest time cost — this is what makes a recommendation feel real. */
  effort: string;
  /** Expected movement, e.g. "Trust +12". */
  lift: string;
}

export interface Insight {
  title: string;
  detail: string;
}

/** Where a report came from. Shown to the user; never inferred in the UI. */
export type ReportSource = "model" | "sample";

export interface PerceptionReport {
  id: string;
  createdAt: string;
  source: ReportSource;
  /** 0–100. The number people screenshot. */
  overall: number;
  /** Two to four words naming the impression. */
  archetype: string;
  /** One sentence on the impression formed in the first seconds. */
  headline: string;
  /** What a stranger concludes, in their words. */
  strangerRead: string;
  /** Seconds before a stranger decides. */
  attentionSeconds: number;
  /** Percentile against the distribution Blink scores against. */
  percentile: number;
  metrics: Metric[];
  strength: Insight;
  risk: Insight;
  actions: Action[];
  quickWins: string[];
  verdict: string;
  /** The regions the model could actually locate, for the analysis overlay. */
  detected: DetectedRegions;
}

/**
 * Which parts of the screenshot were found.
 *
 * The analysis overlay lights up regions of the uploaded image as it works.
 * It only claims to have found what the observation actually reports, so the
 * highlight for "highlights" stays dark on a profile that has none.
 */
export interface DetectedRegions {
  avatar: boolean;
  name: boolean;
  bio: boolean;
  highlights: boolean;
  grid: boolean;
  palette: string[];
}

export interface AnalysisInput {
  fileName: string;
  fileSize: number;
  /** Object URL for the preview. Local to the device. */
  previewUrl: string;
  /** JPEG data URL sent for analysis. Absent for the sample run. */
  imageDataUrl?: string;
}

/** A stored analysis. One row per completed run, per user. */
export interface AnalysisRecord {
  id: string;
  uid: string;
  createdAt: string;
  overall: number;
  archetype: string;
  headline: string;
  report: PerceptionReport;
}
