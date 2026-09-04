import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * A Supabase client for the server.
 *
 * A new one per request, never shared: the client carries the caller's session,
 * and a module-level singleton would hand one visitor's session to the next.
 *
 * `server-only` at the top is not decoration. It makes importing this module
 * from a Client Component a build error rather than a runtime surprise.
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /*
           * Server Components may not write cookies. That is expected: the
           * proxy refreshes the session on every request, so a token that
           * rotated during a render is already persisted by the time this
           * throws. Swallowing it is what the Supabase SSR guide prescribes —
           * the alternative is every read-only page crashing on a token
           * refresh.
           */
        }
      },
    },
  });
}
