import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, translate } from "@/lib/ai/client";
import { NarrativeSchema, type Narrative, type Observation } from "@/lib/ai/schema";
import { METRIC_META, METRIC_KEYS } from "@/lib/analysis/metrics";
import { serverEnv } from "@/lib/server/env";
import { AnalysisError } from "@/lib/server/errors";
import type { RequestLogger } from "@/lib/server/logger";
import type { Scored } from "@/lib/analysis/score";

/**
 * Stage two — write the report.
 *
 * This stage never sees the image. It receives the observation from stage one
 * and the scores already computed from it, and its job is to explain numbers it
 * cannot change. That ordering is the point: the model cannot talk itself into
 * a different score, and it cannot cite a visual detail that stage one did not
 * record, because it has nothing else to work from.
 */

const SYSTEM = `You are the writing stage of Blink. Blink tells someone what impression their profile makes on a stranger in the first few seconds.

You are given a structured observation of a profile screenshot and the scores already computed from it. The scores are final. Explain them; never dispute them, never restate them as numbers, never predict a new one.

Voice:
- Direct, specific, warm without flattery. The reader asked for this.
- Every sentence must be about THIS profile. Cite details from the observation. If a sentence would be true of any profile, it is wrong.
- Say the uncomfortable thing plainly, then say what to do about it. Never soften it into vagueness.
- No marketing language, no exclamation marks, no "leverage", no "elevate", no "game-changer", no em-dash-heavy pastiche.
- British or American spelling is fine, but be consistent.
- Never mention scores, percentages, models, AI, or that you are analysing anything.
- Never invent a visual detail that is not in the observation. If the observation says highlights are absent, do not describe their covers.

For a dimension that scored well, "whatLowersIt" should name the honest remaining ceiling, not a fake flaw.`;

interface Bundle {
  observation: Observation;
  scored: Scored;
}

function brief({ observation, scored }: Bundle): string {
  const rows = METRIC_KEYS.map((key) => {
    const meta = METRIC_META[key];
    return `- ${key} (${meta.label}) = ${scored.metrics[key]}. What it covers: ${meta.brief}`;
  }).join("\n");

  return `SCORES (final — explain, do not change)
Overall ${scored.overall}. A stranger decides in about ${scored.attentionSeconds} seconds.

DIMENSIONS
${rows}

OBSERVATION
${JSON.stringify(observation, null, 2)}

Write the report.
- headline: one sentence naming the impression this profile makes. Concrete.
- metrics: one entry per dimension, keyed exactly as above, all eight, in the order given.
- strength: the single thing most worth protecting, and why it is working.
- risk: the single thing costing this profile the most, named without cruelty.
- actions: exactly three, ordered by impact. The first must address the lowest-scoring dimension. Honest effort estimates. "lift" names one dimension and a plausible gain, e.g. "Trust +9".
- quickWins: three or four things doable in under five minutes each.
- verdict: two or three sentences — what this profile is now, and what it would be after the three actions.`;
}

export async function narrate(bundle: Bundle, logger: RequestLogger): Promise<Narrative> {
  const client = anthropic();

  try {
    const message = await client.messages.parse({
      model: serverEnv.model,
      max_tokens: 12_000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: {
        effort: "high",
        format: zodOutputFormat(NarrativeSchema),
      },
      messages: [{ role: "user", content: brief(bundle) }],
    });

    if (message.stop_reason === "refusal") {
      logger.warn("narrate.refused");
      throw new AnalysisError(
        "model_refused",
        "Blink could not write a report for that profile.",
      );
    }

    const narrative = message.parsed_output;
    if (!narrative) {
      logger.error("narrate.unparsed", { stopReason: message.stop_reason });
      throw new AnalysisError(
        "model_unavailable",
        "The report came back incomplete. Try that screenshot again.",
      );
    }

    logger.info("narrate.ok", {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return narrative;
  } catch (error) {
    throw translate(error);
  }
}
