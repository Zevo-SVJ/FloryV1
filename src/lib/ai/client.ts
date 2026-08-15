import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/server/env";
import { AnalysisError } from "@/lib/server/errors";

/**
 * One client, made on first use.
 *
 * Kept behind a function so importing anything in this directory does not
 * require a key — the route decides whether analysis is available, and says so
 * plainly when it is not.
 */

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!serverEnv.anthropicApiKey) {
    throw new AnalysisError(
      "not_configured",
      "Blink's analysis model is not connected on this deployment.",
    );
  }

  client ??= new Anthropic({
    apiKey: serverEnv.anthropicApiKey,
    ...(serverEnv.anthropicBaseUrl ? { baseURL: serverEnv.anthropicBaseUrl } : {}),
    maxRetries: 2,
    timeout: 120_000,
  });

  return client;
}

/** Turn an SDK failure into something the interface can show a person. */
export function translate(error: unknown): AnalysisError {
  if (error instanceof AnalysisError) return error;

  if (error instanceof Anthropic.RateLimitError) {
    return new AnalysisError(
      "rate_limited",
      "Blink is analysing more profiles than usual right now. Try again in a minute.",
      30,
    );
  }

  if (
    error instanceof Anthropic.APIConnectionTimeoutError ||
    error instanceof Anthropic.APIConnectionError
  ) {
    return new AnalysisError(
      "model_unavailable",
      "Blink could not reach the analysis model. Your screenshot was not stored.",
    );
  }

  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AnalysisError(
      "not_configured",
      "Blink's analysis model rejected this deployment's credentials.",
    );
  }

  if (error instanceof Anthropic.BadRequestError) {
    return new AnalysisError(
      "unsupported_image",
      "That image could not be read. A PNG or JPEG screenshot works best.",
    );
  }

  if (error instanceof Anthropic.APIError) {
    return new AnalysisError(
      "model_unavailable",
      "The analysis model returned an error. Try that screenshot again.",
    );
  }

  return new AnalysisError("internal", "Something went wrong during the analysis.");
}
