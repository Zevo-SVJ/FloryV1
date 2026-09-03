import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv, serviceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * The one client that bypasses Row Level Security.
 *
 * It exists for exactly one job: writing analytics events. `page_views` and
 * `link_clicks` have no insert policy and never will — an anonymous insert
 * policy would let anybody forge a creator's traffic with a console open,
 * which would make every number in the dashboard worthless. So ingestion runs
 * as a trusted server path instead.
 *
 * Three rules hold wherever this is used:
 *
 *   · Never for reads. Analytics are read through `security invoker` functions
 *     with the creator's own session, so RLS decides whose rows they are. A
 *     read through this client would be a read with no owner check at all.
 *
 *   · Never with a value from the request. The profile id and link id written
 *     by the tracking routes are resolved server-side from a username or a
 *     link id that was looked up first; nothing the client sent is inserted as
 *     an owner.
 *
 *   · Never in a Client Component. `server-only` makes that a build error
 *     rather than the worst possible runtime surprise.
 *
 * Returns null when the key is absent, which is the normal state of a
 * development clone. Analytics then records nothing and every page keeps
 * working — the callers are written to treat that as unremarkable.
 */
export function createAdminClient() {
  const key = serviceRoleKey();
  if (!key) return null;

  const { url } = requireSupabaseEnv();

  return createClient<Database>(url, key, {
    auth: {
      // A service client has no user and must never pick one up from storage.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
