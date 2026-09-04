"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * A Supabase client for the browser.
 *
 * Holds only the anon key, which grants exactly what Row Level Security allows
 * and nothing more. Memoized because `createBrowserClient` installs auth
 * listeners, and a second instance would mean two clients fighting over one
 * cookie.
 *
 * Most of LOCK should not need this. Reads belong in Server Components and
 * writes belong in Server Actions; this exists for the genuinely client-side
 * cases, such as reacting to an auth state change in another tab.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) return browserClient;
  const { url, anonKey } = requireSupabaseEnv();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
