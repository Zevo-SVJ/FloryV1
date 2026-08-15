"use client";

import type { ErrorCode } from "@/lib/server/errors";
import { SAMPLE_REPORT } from "@/lib/analysis/sample";
import type { PerceptionReport } from "@/types/report";

/**
 * The analysis boundary, from the browser's side.
 *
 * One function sends a prepared screenshot to Blink's own API and returns a
 * report. It does not fall back to a fabricated report when the model is
 * unavailable — it fails, with a message saying why, because a made-up score
 * presented as an analysis is the one thing this product cannot afford to do.
 */

export class AnalysisFailure extends Error {
  readonly code: ErrorCode;
  readonly requestId: string | null;

  constructor(code: ErrorCode, message: string, requestId: string | null = null) {
    super(message);
    this.name = "AnalysisFailure";
    this.code = code;
    this.requestId = requestId;
  }
}

interface Wire {
  report?: PerceptionReport;
  error?: { code?: string; message?: string; requestId?: string };
}

const KNOWN_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  "invalid_request",
  "unsupported_image",
  "not_a_profile",
  "too_large",
  "rate_limited",
  "not_configured",
  "model_refused",
  "model_unavailable",
  "internal",
]);

export interface AnalyzeArgs {
  imageDataUrl: string;
  fileName: string;
  fileSize: number;
  /** A Firebase ID token, when someone is signed in. */
  idToken?: string | null;
  signal?: AbortSignal;
}

export async function analyzeProfile({
  imageDataUrl,
  fileName,
  fileSize,
  idToken,
  signal,
}: AnalyzeArgs): Promise<PerceptionReport> {
  let response: Response;

  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      signal: signal ?? null,
      headers: {
        "content-type": "application/json",
        ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ image: imageDataUrl, fileName, fileSize }),
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new AnalysisFailure(
      "model_unavailable",
      "Blink could not reach the analysis. Check your connection and try again.",
    );
  }

  const requestId = response.headers.get("x-request-id");

  let body: Wire = {};
  try {
    body = (await response.json()) as Wire;
  } catch {
    // Fall through to the status-based message below.
  }

  if (!response.ok || !body.report) {
    const code =
      body.error?.code && KNOWN_CODES.has(body.error.code)
        ? (body.error.code as ErrorCode)
        : "internal";
    throw new AnalysisFailure(
      code,
      body.error?.message ?? "The analysis stopped before it finished.",
      body.error?.requestId ?? requestId,
    );
  }

  return body.report;
}

/** The sample, for people who want to see the product before uploading. */
export function sampleReport(): PerceptionReport {
  return { ...SAMPLE_REPORT, createdAt: new Date().toISOString() };
}
