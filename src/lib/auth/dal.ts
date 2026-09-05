import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";
import { isSupabaseConfigured } from "@/lib/env";
import { signInUrl } from "@/lib/auth/routes";
import { roleAllows, type SectionAccess } from "@/lib/lock/navigation";
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
 * and three components all asking "who is signed in?" cost one request to
 * Supabase rather than five.
 */

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * A session with no profile behind it.
 *
 * The schema says this cannot happen: a trigger creates the profile inside the
 * same transaction as the auth row, and no client may delete one. Reaching here
 * means the database is unreachable in a way that looks like an empty result,
 * or somebody removed the row by hand.
 *
 * Thrown rather than redirected, and that matters. Sending these accounts to
 * `/login` would loop — the proxy bounces a signed-in visitor away from
 * `/login`, onto `/dashboard`, which would land here again. The app shell's
 * error boundary catches it and offers the one action that helps: signing out.
 */
export class ProfileUnavailableError extends Error {
  constructor() {
    super("You are signed in, but this account has no profile.");
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
   * normally makes a route dynamic on its own, but the unconfigured branch
   * below returns before touching them — which would let a protected page be
   * baked at build time into whatever the build machine saw. `connection()`
   * states the requirement once, here, rather than relying on every route to
   * remember it. (Next.js 16 removed `export const dynamic`.)
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
    // entry page keeps working and protected pages send people to sign in.
    return null;
  }
});

/**
 * Where the visitor was trying to go.
 *
 * Set by the proxy, because a Server Component cannot read its own URL. Used so
 * that being bounced to sign in returns you to the page you asked for rather
 * than dumping you on the dashboard.
 */
const currentPath = cache(async (): Promise<string | undefined> => {
  try {
    return (await headers()).get(PATHNAME_HEADER) ?? undefined;
  } catch {
    return undefined;
  }
});

/** The same as `getUser`, but insisted upon. Redirects rather than returning null. */
export const requireUser = cache(async (returnTo?: string): Promise<SessionUser> => {
  const user = await getUser();
  if (!user) redirect(signInUrl(returnTo ?? (await currentPath())));
  return user;
});

/**
 * The signed-in account's profile.
 *
 * Null means the session is gone or the database is unreachable — not "this
 * account has not set up a profile yet", which the schema makes impossible.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
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

/** The profile, insisted upon. Everything behind the app shell starts here. */
export const requireProfile = cache(async (returnTo?: string): Promise<Profile> => {
  await requireUser(returnTo);

  const profile = await getProfile();
  if (!profile) throw new ProfileUnavailableError();
  return profile;
});

/**
 * The profile, and whether it clears a section's bar.
 *
 * A role failure is not an error and not a redirect — it is a page that says
 * "this is not for your account", rendered where the visitor already is. So
 * this returns the answer rather than throwing it, and the caller renders one
 * of two things.
 *
 * Deliberately not an `error.tsx` boundary catching a typed exception: Next.js
 * strips error messages in production builds, leaving a boundary with nothing
 * to distinguish "forbidden" from "the database fell over". A returned value
 * survives the production build; a thrown type does not.
 *
 * `forbidden()` from Next.js would be the idiomatic answer and is still behind
 * the experimental `authInterrupts` flag. LOCK does not enable experimental
 * flags. The mentor and admin areas were built against this returned value and
 * behave correctly in production, so it stays: an experimental flag is a poor
 * trade for a pattern that already works.
 */
export async function checkAccess(
  access: SectionAccess,
  returnTo?: string,
): Promise<{ profile: Profile; allowed: boolean }> {
  const profile = await requireProfile(returnTo);
  return { profile, allowed: roleAllows(profile.role, access) };
}
