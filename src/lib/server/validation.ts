import { z } from "zod";
import { AnalysisError } from "@/lib/server/errors";
import { serverEnv } from "@/lib/server/env";
import type { ImagePayload, SupportedMediaType } from "@/lib/ai/observe";

/**
 * Nothing reaches the model unchecked.
 *
 * The request body is validated, the data URL is parsed rather than trusted,
 * and the decoded size is measured from the base64 length before any buffer is
 * allocated — so an oversized upload is refused without being materialised.
 */

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

export const AnalyzeRequestSchema = z.object({
  /** `data:image/jpeg;base64,…` — produced by the client after downscaling. */
  image: z.string().min(64).max(24_000_000),
  fileName: z.string().min(1).max(300),
  fileSize: z.number().int().min(1).max(200 * 1024 * 1024),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export async function readAnalyzeRequest(request: Request): Promise<AnalyzeRequest> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AnalysisError("invalid_request", "That request could not be read.");
  }

  const parsed = AnalyzeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AnalysisError("invalid_request", "That request was missing a screenshot.");
  }

  return parsed.data;
}

/** Decoded byte count from base64 length, without decoding. */
function decodedSize(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function readImage(dataUrl: string): ImagePayload {
  const match = DATA_URL.exec(dataUrl.trim());
  if (!match) {
    throw new AnalysisError(
      "unsupported_image",
      "Blink reads PNG, JPEG and WebP screenshots.",
    );
  }

  const mediaType = match[1] as SupportedMediaType;
  const data = match[2]!.replace(/\s+/g, "");

  if (decodedSize(data) > serverEnv.maxUploadBytes) {
    throw new AnalysisError(
      "too_large",
      "That screenshot is larger than Blink accepts. A normal phone screenshot is well under the limit.",
    );
  }

  return { mediaType, data };
}
