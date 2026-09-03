import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";
import { isSupabaseConfigured } from "@/lib/env";
import { ONBOARDING_PATH, signInUrl } from "@/lib/auth/routes";
import type { Profile } from "@/types/database";

/**
 * The data access layer.
 *
 * Every read that depends on who is asking goes through here, and every one of
 * these functions verifies the session itself. That is deliberate: the proxy's
 * redirect is a convenience for the browser, but a Server Action can be invoked
 * by a direct POST that never passed through a layout, so the check has to live
 * next to the data rather than in front of the page.
 *
 * `cache()` memoizes for the duration of one render pass, so a layout, a page
 * and three components asking "who is signed in?" cost one request to Supabase
 * rather than five.
 */

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * A session with no profile behind it.
 *
 * The schema says this cannot happen — a trigger creates a profile inside the
 * same transaction as the auth row, and since
 * `20260107000000_hardening.sql` no client may delete one. So reaching here
 * means either the database is unreachable in a way that looks like an empty
 * result, or an administrator removed the row by hand.
 *
 * It is thrown rather than redirected, and that is the fix for a real bug: the
 * old code sent these accounts to `/login`, which the proxy bounces a
 * signed-in visitor away from, which lands on `/dashboard`, which redirects to
 * `/login` — a loop the browser gives up on with no way out. The `(app)` error
 * boundary catches this and offers the one action that actually helps, which
 * is signing out.
 */
export class ProfileUnavailableError extends Error {
  constructor() {
    super("Your account is signed in but has no page.");
    this.name = "ProfileUnavailableError";
  }
}

/**
 * The signed-in user, or null.
 *
 * `getUser()` rather than `getSession()`: the latter decodes the cookie and
 * trusts it, which is fine for rendering a name and unacceptable for deciding
 * what somebody may read.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  /*
   * Nothing that depends on who is asking may be prerendered. Reading cookies
   * normally makes a route dynamic on its own, but the unconfigured path below
   * returns before touching them — which would let a protected page be baked
   * at build time into whatever the build machine saw. `connection()` states
   * the requirement once, here, rather than relying on every route to remember
   * it. (Next.js 16 removed `export const dynamic`.)
   */
  await connection();

  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    // Supabase unreachable. Treated as signed out rather than as a crash: the
    // public pages keep working and protected pages send people to sign in.
    return null;
  }
});

/**
 * Where the visitor was trying to go.
 *
 * Set by the proxy, because a Server Component cannot read its own URL. Used
 * so that being bounced to sign in returns you to the page you asked for
 * rather than dumping you on the dashboard.
 */
const currentPath = cache(async (): Promise<string | undefined> => {
  try {
    return (await headers()).get(PATHNAME_HEADER) ?? undefined;
  } catch {
    return undefined;
  }
});

/** The same, but insisted upon. Redirects rather than returning null. */
export const requireUser = cache(async (returnTo?: string): Promise<SessionUser> => {
  const user = await getUser();
  if (!user) redirect(signInUrl(returnTo ?? (await currentPath())));
  return user;
});

/**
 * The signed-in user's profile.
 *
 * A trigger creates one when the account is created, so an authenticated user
 * always has exactly one. Null here therefore means the session is gone or the
 * database is unreachable — not "this user has not set up a profile yet".
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
});

/**
 * The signed-in user's profile, insisting that onboarding is finished.
 *
 * Anything behind the app shell can assume a chosen username, which is what
 * lets the dashboard print an address without checking whether there is one.
 */
export const requireClaimedProfile = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();
  if (!profile.username_claimed_at) redirect(ONBOARDING_PATH);
  return profile;
});

export const requireProfile = cache(async (returnTo?: string): Promise<Profile> => {
  await requireUser(returnTo);

  const profile = await getCurrentProfile();
  if (!profile) throw new ProfileUnavailableError();
  return profile;
});
