import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";
import {
  AFTER_SIGN_IN,
  isAuthOnlyPath,
  isProtectedPath,
  needsSession,
  signInUrl,
} from "@/lib/auth/routes";
import type { Database } from "@/types/database";

/**
 * Session refresh, on every request that renders something.
 *
 * Supabase access tokens are short-lived. Server Components cannot write
 * cookies, so without this a refreshed token would be thrown away on every
 * render and people would be signed out at random. This runs before rendering,
 * refreshes the token, and writes it back onto the outgoing response.
 *
 * Two rules from the Supabase SSR guide that are easy to get wrong, and both
 * cause bugs which only appear in production:
 *
 *   1. The response object must be recreated whenever cookies are written, and
 *      the *same* object must be returned. Returning a fresh `NextResponse`
 *      drops the refreshed token.
 *   2. `getUser()`, not `getSession()`. `getSession()` reads the cookie and
 *      believes it; `getUser()` verifies it with the auth server, which is the
 *      only version worth basing a redirect on.
 *
 * The redirects here are an optimization, not the security boundary. They stop
 * a signed-out visitor from seeing an app shell flash before it disappears. The
 * real checks are `requireUser()` and friends in `lib/auth/dal.ts`, next to the
 * data.
 */

/**
 * The header the proxy uses to tell the render which path it is serving.
 *
 * Server Components have no `usePathname`, and the data access layer needs the
 * current path to send somebody back where they were headed after signing in.
 */
export const PATHNAME_HEADER = "x-lock-pathname";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const forward = { request: { headers: requestHeaders } };
  let response = NextResponse.next(forward);

  const env = supabaseEnv();
  // An unconfigured deployment still serves the entry page, which explains
  // what is missing. There is simply no session to refresh.
  if (!env) return response;

  // Paths outside the shell have no session to keep alive, and verifying one
  // costs a round trip to the auth server.
  if (!needsSession(request.nextUrl.pathname)) return response;

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next(forward);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // A response carrying auth cookies must never be cached by a CDN, or
        // one visitor's session is served to the next. The library hands us the
        // exact headers for that.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  /*
   * `getUser()` reports a network failure as an error value rather than an
   * exception, so this catch is for the case the library does not cover — and
   * it decides what an outage looks like. A throw here would 500 every page in
   * the application, including the ones that need no session; treating an
   * unanswerable auth server as "no session" instead means the entry page keeps
   * working and protected pages send people to sign in, which is the truthful
   * answer when nobody's session can be verified.
   */
  let user: { id: string } | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    return redirectPreservingCookies(request, response, signInUrl(`${pathname}${search}`));
  }

  if (user && isAuthOnlyPath(pathname)) {
    return redirectPreservingCookies(request, response, AFTER_SIGN_IN);
  }

  /*
   * Nothing is set here to stop the Back button revealing a signed-out shell.
   * A `cache-control` written on this response is replaced by the one Next.js
   * writes when it renders, so the header would never reach the browser — and
   * it is unnecessary anyway: every dynamically rendered response already
   * leaves production with `private, no-cache, no-store`, and `no-store` is
   * precisely what keeps a page out of the back-forward cache. The shell is
   * dynamic because `getUser()` awaits `connection()`, so Back re-requests it,
   * finds no session, and is redirected.
   */
  return response;
}

/**
 * Redirect without losing a token that was just refreshed.
 *
 * The cookies live on the response we were about to return, so they have to be
 * copied across before it is discarded.
 */
function redirectPreservingCookies(
  request: NextRequest,
  carrying: NextResponse,
  destination: string,
): NextResponse {
  const url = request.nextUrl.clone();
  const [pathname, query = ""] = destination.split("?");
  url.pathname = pathname ?? "/";
  url.search = query;

  const redirect = NextResponse.redirect(url);
  for (const cookie of carrying.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
