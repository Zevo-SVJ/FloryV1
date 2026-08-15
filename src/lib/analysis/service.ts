import { observe, type ImagePayload } from "@/lib/ai/observe";
import { narrate } from "@/lib/ai/narrate";
import { compose } from "@/lib/analysis/compose";
import { score } from "@/lib/analysis/score";
import { AnalysisError } from "@/lib/server/errors";
import type { RequestLogger } from "@/lib/server/logger";
import type { PerceptionReport } from "@/types/report";

/**
 * The analysis, end to end.
 *
 * Observe, score, write, assemble. The route knows nothing about the model and
 * the model knows nothing about HTTP, which means this function is the thing to
 * call from anywhere else that ever needs a report — a scheduled re-analysis, a
 * batch job, a test.
 */
export async function runAnalysis(
  image: ImagePayload,
  logger: RequestLogger,
): Promise<PerceptionReport> {
  const observation = await observe(image, logger);

  if (!observation.isProfileScreenshot) {
    logger.info("analysis.rejected", { reason: "not-a-profile", platform: observation.platformGuess });
    throw new AnalysisError(
      "not_a_profile",
      "That does not look like a profile screenshot. Open your profile, take a screenshot of the whole page, and try that.",
    );
  }

  if (observation.captureQuality === "unusable") {
    logger.info("analysis.rejected", { reason: "unusable-capture" });
    throw new AnalysisError(
      "not_a_profile",
      "Too much of that profile is covered to read it. A clean screenshot of the whole page works best.",
    );
  }

  const scored = score(observation);
  logger.debug("analysis.scored", { overall: scored.overall });

  const narrative = await narrate({ observation, scored }, logger);
  const report = compose({ observation, scored, narrative });

  logger.info("analysis.ok", {
    reportId: report.id,
    overall: report.overall,
    archetype: report.archetype,
  });

  return report;
}
