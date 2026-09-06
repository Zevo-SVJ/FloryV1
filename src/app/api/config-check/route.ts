import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * TEMPORARY. Delete once the production configuration question is settled.
 *
 * Production renders the "not configured" notice while the Vercel dashboard
 * shows all three variables set, and every combination of build-time and
 * runtime configuration reproduces correctly outside Vercel. This route asks
 * the running deployment directly.
 *
 * It reports booleans and names. No value is read into the response, and the
 * only string it returns from a variable is the Supabase hostname, which is
 * already inlined into the JavaScript bundle every visitor downloads.
 *
 * The `literal` and `runtime` pair is the point. Next.js replaces a literal
 * `process.env.NEXT_PUBLIC_X` with its build-time value; a computed lookup is
 * left alone and reads the real process environment. So:
 *
 *   literal true,  runtime true   → configured, and the app should agree
 *   literal false, runtime true   → the build inlined an absent value and froze it
 *   literal false, runtime false  → the variable is genuinely not in the runtime
 */
export async function GET() {
  await connection();

  /* Computed on purpose: this is the read Next.js cannot inline. */
  const present = (name: string): boolean => {
    const value = process.env[name];
    return typeof value === "string" && value.trim().length > 0;
  };

  const literalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const literalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  let host: string | null = null;
  try {
    host = literalUrl ? new URL(literalUrl).hostname : null;
  } catch {
    host = "unparseable";
  }

  return Response.json({
    appThinksItIsConfigured: isSupabaseConfigured(),

    literal: {
      supabaseUrlPresent: literalUrl.length > 0,
      supabaseAnonKeyPresent: literalKey.length > 0,
      siteUrlPresent: (process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "").length > 0,
    },

    runtime: {
      supabaseUrlPresent: present("NEXT_PUBLIC_SUPABASE_URL"),
      supabaseAnonKeyPresent: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      siteUrlPresent: present("NEXT_PUBLIC_SITE_URL"),
    },

    supabaseUrlHost: host,

    /* Names only. Every one of these is public by definition and already
       listed in .env.example in the repository. */
    publicVariableNames: Object.keys(process.env)
      .filter((key) => key.startsWith("NEXT_PUBLIC_"))
      .sort(),

    deployment: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      /* Public: this commit is readable on GitHub. */
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },

    renderedAt: new Date().toISOString(),
  });
}
