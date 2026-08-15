import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, translate } from "@/lib/ai/client";
import { ObservationSchema, type Observation } from "@/lib/ai/schema";
import { serverEnv } from "@/lib/server/env";
import { AnalysisError } from "@/lib/server/errors";
import type { RequestLogger } from "@/lib/server/logger";

/**
 * Stage one — look at the screenshot.
 *
 * The model is asked to fill in a form, not to write a review. Every field is
 * an enum, a count, a boolean or a short literal description of something
 * visible. It is told, more than once, that it is not scoring anything: the
 * scoring happens afterwards in `lib/analysis/score.ts`, from these answers.
 *
 * That split is what keeps two runs on the same picture in agreement. Asking a
 * model for "trust out of 100" produces a different number every time. Asking
 * it whether a face is clearly visible produces the same answer every time.
 */

const SYSTEM = `You are the observation stage of Blink, a tool that reports the first impression a social profile makes on a stranger.

Your only job is to look at the screenshot and record what is there. You are filling in a structured form.

Rules:
- Record observations, never scores, never ratings, never advice. Later stages do that.
- Choose the enum value that is literally true of the image. If something is not visible in the crop, use the "unknown"/"none"/false option rather than inferring it.
- Evidence fields must name concrete things you can see — "greyscale portrait, shoulders cropped at the frame edge", "four highlight covers, three beige and one screenshot". Never write praise, criticism or suggestions there.
- Judge the profile picture as it appears at thumbnail size, because that is the size a stranger sees it at.
- Answer identically for identical images. Prefer the plainest reading of the picture over an interesting one.
- Do not transcribe the bio verbatim, and do not repeat personal details beyond the visible handle and display name.
- If the image is not a social profile screenshot, set isProfileScreenshot to false and fill the rest of the form with the neutral options. Do not guess at a profile that is not there.`;

const INSTRUCTION = `Observe this profile screenshot and fill in the form.

Work through it in this order, because it is the order a stranger's eye takes: the profile picture, then the name and handle, then the bio, then the highlights, then the grid as a whole, then the colours across it, then which element actually wins attention first.`;

export type SupportedMediaType = "image/png" | "image/jpeg" | "image/webp";

export interface ImagePayload {
  mediaType: SupportedMediaType;
  /** Base64, no data-URL prefix. */
  data: string;
}

export async function observe(
  image: ImagePayload,
  logger: RequestLogger,
): Promise<Observation> {
  const client = anthropic();

  try {
    const message = await client.messages.parse({
      model: serverEnv.model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: {
        effort: "high",
        format: zodOutputFormat(ObservationSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.data },
            },
            { type: "text", text: INSTRUCTION },
          ],
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      logger.warn("observe.refused");
      throw new AnalysisError(
        "model_refused",
        "Blink could not analyse that image. Try a screenshot of the profile page itself.",
      );
    }

    const observation = message.parsed_output;
    if (!observation) {
      logger.error("observe.unparsed", { stopReason: message.stop_reason });
      throw new AnalysisError(
        "model_unavailable",
        "The analysis came back incomplete. Try that screenshot again.",
      );
    }

    logger.info("observe.ok", {
      isProfile: observation.isProfileScreenshot,
      capture: observation.captureQuality,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return observation;
  } catch (error) {
    throw translate(error);
  }
}
