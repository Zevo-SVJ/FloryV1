import type { Narrative, Observation } from "@/lib/ai/schema";
import { METRIC_META } from "@/lib/analysis/metrics";
import type { Scored } from "@/lib/analysis/score";
import { hashString } from "@/lib/utils";
import {
  METRIC_ORDER,
  type DetectedRegions,
  type Metric,
  type MetricKey,
  type PerceptionReport,
} from "@/types/report";

/**
 * Assemble the report.
 *
 * Three inputs, no invention: the observation says what is there, the score
 * says how good it is, the narrative says it in words. This file only joins
 * them, which is why it is the one place the report's shape is decided.
 */

/**
 * A report id that is a function of the observation.
 *
 * Two runs on the same screenshot produce the same observation, so they produce
 * the same id — which makes the store idempotent and gives a person something
 * stable to quote back at us.
 */
export function reportId(observation: Observation): string {
  const stable = JSON.stringify(observation);
  return `r_${hashString(stable).toString(36)}${hashString(stable.slice(64)).toString(36).slice(0, 4)}`;
}

/** Only claim to have found what the observation actually reports. */
function regions(observation: Observation): DetectedRegions {
  return {
    avatar: observation.avatar.present,
    name: observation.name.displayNamePresent || observation.name.handle !== null,
    bio: observation.bio.present,
    highlights: observation.highlights.present,
    grid: observation.grid.visibleTiles > 0,
    palette: observation.palette.dominantColours.slice(0, 4),
  };
}

export function compose({
  observation,
  scored,
  narrative,
  createdAt = new Date().toISOString(),
}: {
  observation: Observation;
  scored: Scored;
  narrative: Narrative;
  createdAt?: string;
}): PerceptionReport {
  const written = new Map(narrative.metrics.map((entry) => [entry.key, entry]));

  const metrics: Metric[] = METRIC_ORDER.map((key, index) => {
    const meta = METRIC_META[key];
    // Prefer the keyed entry; fall back to position, since the schema pins the
    // count and the order at eight.
    const copy = written.get(key) ?? narrative.metrics[index];

    return {
      key,
      label: meta.label,
      score: scored.metrics[key],
      whyItMatters: meta.whyItMatters,
      detected: copy?.detected ?? "",
      whatLowersIt: copy?.whatLowersIt ?? "",
      howToImprove: copy?.howToImprove ?? "",
      expectedImpact: copy?.expectedImpact ?? "",
    };
  });

  return {
    id: reportId(observation),
    createdAt,
    source: "model",
    overall: scored.overall,
    archetype: observation.impression.archetype,
    headline: narrative.headline,
    strangerRead: observation.impression.strangerRead,
    attentionSeconds: scored.attentionSeconds,
    percentile: scored.percentile,
    metrics,
    strength: narrative.strength,
    risk: narrative.risk,
    actions: narrative.actions,
    quickWins: narrative.quickWins,
    verdict: narrative.verdict,
    detected: regions(observation),
  };
}

/** The lowest-scoring dimension. The report starts people here. */
export function weakest(report: PerceptionReport): MetricKey {
  return report.metrics.reduce((low, metric) =>
    metric.score < low.score ? metric : low,
  ).key;
}
