import { MOCK_REPORTS } from "@/lib/mock/reports";
import { clamp, hashString } from "@/lib/utils";
import type { AnalysisInput, PerceptionReport } from "@/types/report";

/**
 * The analysis boundary.
 *
 * Everything the interface knows about analysis is `analyzeProfile()`. Swapping
 * the mock engine for a real vision model is a one-line change here — set
 * `NEXT_PUBLIC_ANALYSIS_MODE=remote` and point `remoteEngine` at your route.
 * No component reaches past this file.
 */

export const ANALYSIS_DURATION_MS = 5_000;

type Engine = (input: AnalysisInput) => Promise<PerceptionReport>;

/** Deterministic per file, jittered per run — believable without being random. */
function buildReport(input: AnalysisInput, baseIndex?: number): PerceptionReport {
  const seed = hashString(`${input.fileName}:${input.fileSize}`);
  const base =
    MOCK_REPORTS[baseIndex ?? seed % MOCK_REPORTS.length] ?? MOCK_REPORTS[0]!;

  // A small, stable drift so two different screenshots never score identically.
  const drift = (offset: number, spread: number) =>
    (((seed >> offset) % (spread * 2 + 1)) - spread);

  const metrics = base.metrics.map((metric, index) => ({
    ...metric,
    score: clamp(metric.score + drift(index * 3 + 2, 3), 12, 99),
  }));

  const overall = clamp(
    Math.round(
      metrics.reduce((total, metric) => total + metric.score, 0) / metrics.length,
    ),
    12,
    99,
  );

  return {
    ...base,
    id: `${base.id}-${seed.toString(36).slice(0, 6)}`,
    createdAt: new Date().toISOString(),
    metrics,
    overall,
    percentile: clamp(base.percentile + drift(11, 4), 5, 99),
    attentionSeconds:
      Math.round((base.attentionSeconds + drift(17, 3) / 10) * 10) / 10,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockEngine: Engine = async (input) => {
  // The wait is deliberate: the loading sequence is part of the product.
  await wait(ANALYSIS_DURATION_MS);
  return buildReport(input);
};

/**
 * Reference implementation for a real backend. Expects a route that accepts the
 * screenshot and returns a `PerceptionReport`.
 */
const remoteEngine: Engine = async (input) => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: input.fileName,
      fileSize: input.fileSize,
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed with status ${response.status}`);
  }

  return (await response.json()) as PerceptionReport;
};

const engine: Engine =
  process.env.NEXT_PUBLIC_ANALYSIS_MODE === "remote" ? remoteEngine : mockEngine;

export function analyzeProfile(input: AnalysisInput): Promise<PerceptionReport> {
  return engine(input);
}

const SAMPLE_INPUT: AnalysisInput = {
  fileName: "sample-profile.png",
  fileSize: 482_119,
  previewUrl: "",
};

/**
 * The sample run. It always returns the first report — a high scorer with a
 * real problem — because the demo should be flattering and uncomfortable at
 * the same time. It goes through the same wait as a real analysis.
 */
export async function analyzeSample(): Promise<PerceptionReport> {
  if (process.env.NEXT_PUBLIC_ANALYSIS_MODE === "remote") {
    return analyzeProfile(SAMPLE_INPUT);
  }

  await wait(ANALYSIS_DURATION_MS);
  return buildReport(SAMPLE_INPUT, 0);
}
