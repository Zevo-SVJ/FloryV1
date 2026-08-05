/**
 * The perception report contract.
 *
 * This is the boundary between the interface and whatever produces the
 * analysis — a mock engine today, a vision model later. Everything the UI
 * renders comes from this shape, so swapping the source changes nothing
 * above it.
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

export interface Metric {
  key: MetricKey;
  label: string;
  score: number;
  /** What a stranger actually perceives. Specific, never generic. */
  reading: string;
  /** Why this dimension changes whether someone follows. */
  whyItMatters: string;
  /** The concrete thing on this profile that is holding the score down. */
  whatLowersIt: string;
  /** The single change that would move it, stated as an instruction. */
  howToImprove: string;
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

export interface PerceptionReport {
  id: string;
  createdAt: string;
  /** 0–100. The number people screenshot. */
  overall: number;
  /** Three or four words naming the impression. */
  archetype: string;
  /** One sentence on the impression formed in the first seconds. */
  headline: string;
  /** Seconds before a stranger decides. */
  attentionSeconds: number;
  /** Percentile against the profiles Blink has seen. */
  percentile: number;
  metrics: Metric[];
  strength: Insight;
  risk: Insight;
  actions: Action[];
  quickWins: string[];
  verdict: string;
}

export interface AnalysisInput {
  fileName: string;
  fileSize: number;
  /** Object URL for the preview. Never uploaded in this build. */
  previewUrl: string;
}
