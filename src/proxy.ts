import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every rendered route.
 *
 * Next.js 16 renamed this file from `middleware.ts` to `proxy.ts`; the
 * behaviour is unchanged. Its one job is to refresh the Supabase session and
 * write the rotated cookie onto the response — see `lib/supabase/proxy.ts` for
 * why that cannot happen during rendering.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Everything except static assets. Auth cookies rotate on requests that
   * render pages, not on the ones that fetch a font, and running this on
   * `_next/static` would put a Supabase round trip in front of every stylesheet.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
