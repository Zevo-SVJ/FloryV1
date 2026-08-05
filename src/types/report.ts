/**
 * The shape of a perception report.
 *
 * This is the contract between the interface and whatever produces the
 * analysis. Today that is `mockEngine`; tomorrow it can be a vision model
 * behind an HTTP endpoint. Nothing in the UI needs to change.
 */

export type MetricKey =
  | "firstImpression"
  | "trust"
  | "authority"
  | "visualQuality"
  | "personality"
  | "memorability";

export interface Metric {
  key: MetricKey;
  label: string;
  score: number;
  /** One line explaining what a stranger reacted to. Never generic. */
  note: string;
}

export interface Improvement {
  title: string;
  detail: string;
  /** Expected movement, e.g. "+14 trust" — shown as a quiet accent tag. */
  lift: string;
}

export interface PerceptionReport {
  id: string;
  createdAt: string;
  /** 0–100. The number people screenshot. */
  overall: number;
  /** Three or four words: "Composed, quietly premium". */
  archetype: string;
  /** One sentence describing the impression formed in the first seconds. */
  summary: string;
  metrics: Metric[];
  strength: { title: string; detail: string };
  weakness: { title: string; detail: string };
  improvements: Improvement[];
  quickWins: string[];
  verdict: string;
  /** Seconds a stranger spends before deciding. Adds texture to the report. */
  attentionSeconds: number;
  /** Percentile against the profiles Blink has seen. */
  percentile: number;
}

export interface AnalysisInput {
  fileName: string;
  fileSize: number;
  /** Object URL for the preview. Never uploaded anywhere in this build. */
  previewUrl: string;
}
