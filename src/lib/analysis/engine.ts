import { MOCK_REPORTS } from "@/lib/mock/reports";
import { PIPELINE_DURATION_MS } from "@/lib/analysis/pipeline";
import { clamp, hashString } from "@/lib/utils";
import type { AnalysisInput, PerceptionReport } from "@/types/report";

/**
 * The analysis boundary.
 *
 * Everything the interface knows about analysis is `analyzeProfile()`. To put a
 * real vision model behind it, add a route that returns a `PerceptionReport`
 * and set `NEXT_PUBLIC_ANALYSIS_MODE=remote`. No component reaches past this
 * file, so nothing above it changes.
 *
 * Keep a floor on the duration even with a fast model: the pipeline is part of
 * the product, not a gap in it.
 */

type Engine = (input: AnalysisInput) => Promise<PerceptionReport>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deterministic per file, drifted per report — believable, never random. */
function buildReport(input: AnalysisInput, forceIndex?: number): PerceptionReport {
  const seed = hashString(`${input.fileName}:${input.fileSize}`);
  const base =
    MOCK_REPORTS[forceIndex ?? seed % MOCK_REPORTS.length] ?? MOCK_REPORTS[0]!;

  const drift = (offset: number, spread: number) =>
    ((seed >> offset) % (spread * 2 + 1)) - spread;

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

const mockEngine: Engine = async (input) => {
  await wait(PIPELINE_DURATION_MS);
  return buildReport(input);
};

/** Reference implementation for a real backend. */
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

const isRemote = process.env.NEXT_PUBLIC_ANALYSIS_MODE === "remote";
const engine: Engine = isRemote ? remoteEngine : mockEngine;

export function analyzeProfile(input: AnalysisInput): Promise<PerceptionReport> {
  return engine(input);
}

const SAMPLE_INPUT: AnalysisInput = {
  fileName: "blink-sample-profile.png",
  fileSize: 482_119,
  previewUrl: "",
};

/**
 * The sample run — always the first report, because the demo should be
 * flattering and uncomfortable at the same time. Same wait as a real run.
 */
export async function analyzeSample(): Promise<PerceptionReport> {
  if (isRemote) return analyzeProfile(SAMPLE_INPUT);
  await wait(PIPELINE_DURATION_MS);
  return buildReport(SAMPLE_INPUT, 0);
}

/** A finished report for the landing page's preview, with no wait. */
export function previewReport(): PerceptionReport {
  return buildReport(SAMPLE_INPUT, 0);
}
