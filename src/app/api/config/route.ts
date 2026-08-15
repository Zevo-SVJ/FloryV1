import { NextResponse } from "next/server";
import { instagram } from "@/lib/instagram";
import { authConfigured } from "@/lib/firebase/config";
import { analysisConfigured, type PublicConfig } from "@/lib/server/env";

/**
 * GET /api/config
 *
 * What this deployment can actually do. The interface reads it once on load so
 * it can tell the truth about itself — offer sign-in only where accounts exist,
 * label the sample as a sample where no model is connected — instead of
 * advertising capabilities the server does not have.
 */

export const runtime = "nodejs";

export async function GET() {
  const config: PublicConfig = {
    analysis: analysisConfigured() ? "model" : "sample-only",
    auth: authConfigured() ? "firebase" : "disabled",
    instagram: instagram().available ? "available" : "unavailable",
  };

  return NextResponse.json(config, {
    headers: { "cache-control": "no-store" },
  });
}
