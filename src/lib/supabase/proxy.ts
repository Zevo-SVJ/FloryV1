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
 * Session refresh, on every request.
 *
 * Supabase access tokens are short-lived. Server Components cannot write
 * cookies, so without this the refreshed token would be thrown away on every
 * render and people would be logged out at random. This runs before rendering,
 * refreshes the token, and writes it back onto the outgoing response.
 *
 * Two rules from the Supabase SSR guide that are easy to get wrong, and both
 * cause bugs that only show up in production:
 *
 *   1. The response object must be recreated whenever cookies are written, and
 *      the *same* object must be returned. Returning a fresh `NextResponse`
 *      drops the refreshed token.
 *   2. `getUser()` — not `getSession()`. `getSession()` reads the cookie and
 *      believes it. `getUser()` verifies it with the auth server, which is the
 *      only version worth basing a redirect on.
 *
 * The redirects here are an optimization, not the security boundary. They keep
 * a signed-out visitor from seeing a dashboard shell flash before it
 * disappears. The real check is `requireUser()` in the layout, next to the data.
 */
/**
 * The header the proxy uses to tell the render which path it is serving.
 *
 * Server Components have no `usePathname`, and the data access layer needs the
 * current path to send somebody back where they were headed after signing in.
 */
export const PATHNAME_HEADER = "x-showme-pathname";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    PATHNAME_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const forward = { request: { headers: requestHeaders } };
  let response = NextResponse.next(forward);

  const env = supabaseEnv();
  // Unconfigured deployments still serve the public pages; there is simply no
  // session to refresh and nothing to protect.
  if (!env) return response;

  /*
   * Public creator pages get out of here before any of the below. Verifying a
   * session costs a request to the auth server, and `/[username]` is served to
   * people who do not have one — it is the single hottest path in the product
   * and the one whose latency a creator's audience actually feels.
   */
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
        // A response that carries auth cookies must never be cached by a CDN,
        // or one visitor's session is served to the next. The library hands us
        // the exact headers for that.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    return redirectPreservingCookies(request, response, signInUrl(`${pathname}${search}`));
  }

  if (user && isAuthOnlyPath(pathname)) {
    return redirectPreservingCookies(request, response, AFTER_SIGN_IN);
  }

  /*
   * Nothing is set here to stop the Back button revealing a signed-out
   * dashboard. It was tried, and it was theatre: a `cache-control` set on this
   * response is replaced by the one Next.js writes when it renders, so the
   * header never reached the browser.
   *
   * It is also unnecessary. Every dynamically rendered response already leaves
   * production with `private, no-cache, no-store, max-age=0, must-revalidate`,
   * and `no-store` is precisely what keeps a page out of the back-forward
   * cache. The dashboard is dynamic because `getUser()` awaits `connection()`,
   * so Back re-requests it, finds no session, and is redirected.
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
