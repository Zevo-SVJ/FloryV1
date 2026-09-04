import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeReturnTo, signInUrl } from "@/lib/auth/routes";

/**
 * Where a confirmation email comes back to.
 *
 * `@supabase/ssr` uses the PKCE flow, so the link in the email carries a `code`
 * that is worth nothing until it is exchanged for a session — and the exchange
 * has to happen on the server, because the verifier lives in an HTTP-only
 * cookie. Without this route the link lands on a page that reads the session,
 * finds none, and bounces the person to sign in: an account created and
 * confirmed that nobody can get into.
 *
 * A failure sends them to sign in rather than showing an error page. By then
 * the account is confirmed and signing in works; a stack trace would be true
 * and useless.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeReturnTo(searchParams.get("next"));

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(signInUrl(), request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(signInUrl(), request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
