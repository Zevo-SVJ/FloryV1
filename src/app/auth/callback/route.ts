import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { AFTER_SIGN_IN, SIGN_IN_PATH, safeReturnTo } from "@/lib/auth/routes";

/**
 * Where a link in an email lands.
 *
 * `@supabase/ssr` pins the PKCE flow — it sets `flowType: "pkce"` itself and
 * offers no way to turn it off — which means every link Supabase mails out
 * comes back as `?code=<uuid>` rather than as a token in a URL fragment. A
 * `code` is not a session. It has to be exchanged for one, on the server,
 * where the resulting cookies can be written.
 *
 * Without this route the confirmation email is a dead end: the click lands on
 * `/dashboard` with a query parameter nothing reads, the visitor has no
 * session, and the proxy sends them to `/login` — where signing in fails too,
 * because the address is still unconfirmed. The account exists, the username
 * is held, and there is no way in. That is the shape of the bug this file
 * exists to prevent, and it only appears once email confirmation is switched
 * on, which is the configuration a real deployment wants.
 *
 * It is deliberately not a page. There is nothing to render: the exchange
 * happens and the visitor is redirected, so a Route Handler is the whole job
 * and it never flashes a blank screen on the way through.
 */

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;

  /*
   * The destination is put through the same guard the sign-in form uses. It
   * arrives in a URL that Supabase echoed back from an email, which is exactly
   * the sort of value that turns into an open redirect when somebody assumes
   * it came from us.
   */
  const destination = safeReturnTo(searchParams.get("next"));

  /*
   * Redirects are built against the configured origin rather than against the
   * request's own host. Behind a proxy `request.url` can carry an internal
   * hostname, and an auth redirect to `http://0.0.0.0:3000/dashboard` is a
   * confusing way to lose a session.
   */
  const to = (path: string) => NextResponse.redirect(new URL(path, siteUrl()));

  if (!isSupabaseConfigured()) return to(SIGN_IN_PATH);

  /*
   * Supabase reports a refused link — expired, already used, or tampered with
   * — as `error` and `error_description` on the query string rather than as a
   * failed exchange. It is handled first so those cases do not fall through
   * into an exchange that would fail less clearly.
   */
  if (searchParams.get("error")) {
    return to(`${SIGN_IN_PATH}?notice=link-expired`);
  }

  const code = searchParams.get("code");
  if (!code) return to(SIGN_IN_PATH);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return to(`${SIGN_IN_PATH}?notice=link-expired`);

  /*
   * `AFTER_SIGN_IN` rather than the raw destination when the guard rejected
   * it: a confirmed account should always land somewhere useful.
   */
  return to(destination || AFTER_SIGN_IN);
}
