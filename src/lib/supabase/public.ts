import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * A Supabase client with no session at all.
 *
 * The public creator page is read by strangers. It has no business knowing who
 * is asking, and asking costs it twice over:
 *
 *   · The session-aware client reads cookies, and a route that reads cookies
 *     can never be cached. That is the wrong trade for the one page in this
 *     product that gets opened from a TikTok bio on mobile data.
 *
 *   · Row Level Security would then evaluate as `authenticated` for a
 *     signed-in visitor, so a creator opening their own public URL would see
 *     their own unpublished links sitting there looking published.
 *
 * With no cookie there is no session, the `anon` role applies, and every
 * visitor — signed in or not — sees exactly the page the world sees.
 *
 * Created per call rather than memoized at module scope: this client is
 * stateless, but a module-level instance would outlive a serverless invocation
 * and is not worth the reasoning.
 */
export function createPublicClient() {
  const { url, anonKey } = requireSupabaseEnv();

  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      // Nothing to persist, nothing to refresh, and no storage to reach for.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
