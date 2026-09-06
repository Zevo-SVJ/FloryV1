import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authCallbackPath } from "@/lib/auth/routes";
import { siteUrl, supabaseEnv } from "@/lib/env";

/**
 * TEMPORARY. Deleted as soon as it has answered.
 *
 * "No API key found in request" is the gateway's answer to a request that
 * carried no `apikey`. Reproducing the code path locally shows this project's
 * client attaching one correctly on every call it makes, and `/auth/v1/authorize`
 * — the only Supabase URL the browser is sent to — needs no key at all. So the
 * failing request is one neither of those explains, and the deployment is the
 * only place left to ask.
 *
 * No value is returned. The key is described by which family it belongs to and
 * nothing else; the URLs are public and already in the browser bundle.
 */
export async function GET() {
  await connection();

  const env = supabaseEnv();
  if (!env) return Response.json({ configured: false });

  const keyFamily = env.anonKey.startsWith("sb_publishable_")
    ? "publishable"
    : env.anonKey.startsWith("sb_secret_")
      ? "SECRET — this must never be here"
      : env.anonKey.startsWith("eyJ")
        ? "legacy-jwt"
        : "unrecognised";

  /* Does the project answer this deployment's key at all? `/auth/v1/settings`
     is read-only and returns which providers are enabled. */
  const probe = async (withKey: boolean) => {
    try {
      const res = await fetch(`${env.url}/auth/v1/settings`, {
        headers: withKey ? { apikey: env.anonKey } : {},
        cache: "no-store",
      });
      const text = await res.text();
      let googleEnabled: boolean | null = null;
      try {
        googleEnabled = Boolean(JSON.parse(text)?.external?.google);
      } catch {
        googleEnabled = null;
      }
      return {
        status: res.status,
        noApiKeyError: text.includes("No API key found in request"),
        message: res.ok ? null : text.slice(0, 120),
        googleEnabled,
      };
    } catch (error) {
      return { status: 0, error: String(error).slice(0, 120) };
    }
  };

  const redirectTo = `${siteUrl()}${authCallbackPath("/dashboard")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
  });

  return Response.json({
    configured: true,
    keyFamily,
    supabaseHost: new URL(env.url).hostname,
    siteUrl: siteUrl(),
    redirectTo,
    settingsWithKey: await probe(true),
    settingsWithoutKey: await probe(false),
    oauth: {
      error: error?.message ?? null,
      /* Public values only: provider, redirect target, PKCE challenge. */
      authorizeUrl: data?.url ?? null,
      urlCarriesApiKey: data?.url?.includes("apikey=") ?? null,
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
