import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeReturnTo, signInUrl, signInUrlWithError } from "@/lib/auth/routes";
import { classifyProviderError } from "@/lib/auth/auth-errors";

/**
 * Where an identity provider — and a link in an email — comes back to.
 *
 * `@supabase/ssr` uses PKCE, so what arrives is a `code` that is worth nothing
 * until it is exchanged for a session, and the exchange has to happen on the
 * server because the verifier lives in an HTTP-only cookie. Without this route
 * a Google sign-in lands on a page that reads the session, finds none, and
 * bounces to the sign-in form: a completed round trip that appears to have done
 * nothing.
 *
 * One route serves both flows. That is not a shortcut — the two are the same
 * exchange, and a second route would be a second place for the redirect
 * allowlist and the `next` handling to drift.
 *
 * Every failure path carries a reason. The earlier version redirected to
 * `/login` with nothing attached, which left somebody who had just cancelled at
 * Google's consent screen staring at an unchanged form, unsure whether they had
 * done something wrong. A key travels instead — never the provider's own text;
 * see `lib/auth/auth-errors.ts`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeReturnTo(searchParams.get("next"));

  /*
   * The provider refused, or the person changed their mind. This is checked
   * before `code` because both parameters can be absent together, and "you
   * cancelled" is a better answer than "something went wrong".
   */
  const providerError = searchParams.get("error");
  const providerErrorCode = searchParams.get("error_code");
  if (providerError || providerErrorCode) {
    const key = classifyProviderError({
      error: providerError,
      errorCode: providerErrorCode,
    });
    return NextResponse.redirect(new URL(signInUrlWithError(key, next), request.url));
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL(signInUrlWithError("not_configured", next), request.url),
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    // Somebody opened this URL directly. Nothing failed; there is simply
    // nothing to exchange, so send them to sign in without an alarm.
    return NextResponse.redirect(new URL(signInUrl(next), request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    /*
     * A code that was already used, expired, or arrived in a browser that does
     * not hold the matching verifier — opening the link in a different browser
     * from the one that started the flow is the everyday version of this.
     */
    return NextResponse.redirect(
      new URL(signInUrlWithError("exchange_failed", next), request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
