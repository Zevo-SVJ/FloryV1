import { NextResponse } from "next/server";
import { runAnalysis } from "@/lib/analysis/service";
import { callerUid } from "@/lib/server/auth";
import { analysisConfigured } from "@/lib/server/env";
import { AnalysisError, errorBody, isAnalysisError } from "@/lib/server/errors";
import { newRequestId, requestLogger } from "@/lib/server/logger";
import { callerKey, take } from "@/lib/server/rate-limit";
import { readAnalyzeRequest, readImage } from "@/lib/server/validation";

/**
 * POST /api/analyze
 *
 * One screenshot in, one report out. The route's whole job is the boundary:
 * identify the caller, hold the line on rate, validate the payload, hand it to
 * the service, and turn whatever comes back into an HTTP answer. No analysis
 * logic lives here.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const requestId = newRequestId();
  const logger = requestLogger(requestId);

  try {
    if (!analysisConfigured()) {
      throw new AnalysisError(
        "not_configured",
        "This deployment of Blink has no analysis model connected, so it can only show the sample report.",
      );
    }

    const uid = await callerUid(request);
    const verdict = take(callerKey(request, uid));
    if (!verdict.ok) {
      logger.warn("analyze.rate_limited", { uid: uid ?? null });
      throw new AnalysisError(
        "rate_limited",
        "That is a lot of profiles in a short time. Give it a few minutes.",
        verdict.retryAfter,
      );
    }

    const body = await readAnalyzeRequest(request);
    const image = readImage(body.image);

    logger.info("analyze.start", {
      uid: uid ?? null,
      mediaType: image.mediaType,
      fileSize: body.fileSize,
    });

    const report = await runAnalysis(image, logger);

    return NextResponse.json(
      { report },
      { headers: { "x-request-id": requestId, "cache-control": "no-store" } },
    );
  } catch (error) {
    const failure = isAnalysisError(error)
      ? error
      : new AnalysisError("internal", "Something went wrong during the analysis.");

    if (failure.code === "internal") {
      logger.error("analyze.failed", { message: (error as Error)?.message });
    } else {
      logger.info("analyze.declined", { code: failure.code });
    }

    return NextResponse.json(errorBody(failure, requestId), {
      status: failure.status,
      headers: {
        "x-request-id": requestId,
        "cache-control": "no-store",
        ...(failure.retryAfter ? { "retry-after": String(failure.retryAfter) } : {}),
      },
    });
  }
}
