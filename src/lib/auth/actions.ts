"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuthError, type AuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { requireUser } from "@/lib/auth/dal";
import {
  AFTER_SIGN_IN,
  SIGN_IN_PATH,
  authCallbackPath,
  safeReturnTo,
} from "@/lib/auth/routes";
import { allow, requestKey } from "@/lib/security/rate-limit";
import { displayNameSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import type { AuthField, FormState } from "@/lib/auth/form-state";

/**
 * Sign up, sign in, sign out, rename yourself.
 *
 * Each of these is reachable by direct POST, not only through the form that
 * calls it, so each validates its own input and never trusts a field it did not
 * derive from the session. Nothing here writes a role: the column is not
 * writable through the API at any privilege level (see the foundation
 * migration), so an action that tried would simply be refused.
 *
 * The shape is what `useActionState` expects: previous state first, a
 * `FormState` back. Expected failures are returned rather than thrown, so the
 * form can put a sentence next to the field that caused them.
 */

const ATTEMPT_LIMIT = 12;
const ATTEMPT_WINDOW_MS = 60_000;

const TOO_MANY: FormState = {
  error: "Too many attempts from this connection. Wait a minute and try again.",
};

const NOT_CONFIGURED: FormState = {
  error:
    "LOCK is not connected to a database yet. Add your Supabase keys to .env.local and restart.",
};

async function withinAttemptLimit(scope: string): Promise<boolean> {
  try {
    return allow(requestKey(await headers(), scope), ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS);
  } catch {
    // No request context — nothing to key on, and refusing would break the
    // action rather than protect it.
    return true;
  }
}

/** Turn a Zod failure into per-field messages the form can render. */
function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): FormState {
  const fieldErrors: FormState["fieldErrors"] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "email" || field === "password" || field === "displayName") {
      fieldErrors[field as AuthField] ??= issue.message;
    }
  }
  return { error: "Check the details below.", fieldErrors };
}

/**
 * Supabase's error codes, in the words of the person who hit them.
 *
 * Deliberately vague about which half of a credential was wrong: a reply that
 * distinguishes "no such account" from "wrong password" is an account
 * enumeration oracle.
 */
function describeAuthError(error: AuthError): FormState {
  const code = (error as AuthApiError).code ?? "";

  switch (code) {
    case "invalid_credentials":
      return { error: "That email and password do not match an account." };
    case "email_not_confirmed":
      return { error: "Confirm your email address first — check your inbox for the link." };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { error: "Too many attempts. Wait a minute and try again." };
    case "user_already_exists":
    case "email_exists":
      // Worded the same as a successful signup awaiting confirmation, so this
      // cannot be used to discover which addresses have accounts.
      return { error: "That email address cannot be used. Try signing in instead." };
    case "weak_password":
      return {
        error: "Check the details below.",
        fieldErrors: { password: "That password is too easy to guess." },
      };
    case "signup_disabled":
      // The expected answer on a live deployment: LOCK is private, and signups
      // are switched off in the Supabase dashboard once the accounts exist.
      return { error: "New accounts are closed." };
    default:
      break;
  }

  if (error.status === 429) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  return { error: "Something went wrong. Try again." };
}

/* ── Signing up ───────────────────────────────────────────────────────────── */

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!(await withinAttemptLimit("signup"))) return TOO_MANY;

  const rawName = formData.get("displayName")?.toString().trim();

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: rawName ? rawName : undefined,
  });

  if (!parsed.success) return fieldErrorsFrom(parsed.error.issues);

  const { email, password, displayName } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      /*
       * This travels to `auth.users.raw_user_meta_data`, where the profile
       * trigger reads it. Only the name: the trigger deliberately ignores
       * anything else in there, because everything in there came from a
       * browser.
       */
      data: displayName ? { display_name: displayName } : {},
      /*
       * The callback, not the dashboard. `@supabase/ssr` uses the PKCE flow, so
       * a confirmation link returns a `code` that must be exchanged for a
       * session before there is one. Pointing this straight at `/dashboard`
       * produces an account nobody can get into.
       *
       * Only used when email confirmation is switched on. LOCK's own setup has
       * it off — see the note on the no-session branch below.
       */
      emailRedirectTo: `${siteUrl()}${authCallbackPath(AFTER_SIGN_IN)}`,
    },
  });

  if (error) return describeAuthError(error);

  /*
   * A user but no session means email confirmation is switched on in the
   * Supabase project: the account exists and is waiting on a click in an inbox.
   *
   * For LOCK that is a misconfiguration rather than a flow, and saying so is
   * the honest answer. This is a private product with no SMTP provider
   * configured, so the only sender available is Supabase's shared one — capped
   * at a couple of messages an hour and routinely undelivered. Somebody would
   * create the account, be told to check their inbox, and wait forever.
   *
   * The fix is a setting, not code: Authentication -> Sign In / Providers ->
   * Email -> Confirm email, off. So the message names it. It is deliberately
   * specific about where to click, because the person reading it is the one
   * person who can change it.
   */
  if (!data.session) {
    return {
      error: null,
      message:
        "Account created, but this project still has email confirmation switched on " +
        "and no mail provider configured. Turn it off in Supabase under " +
        "Authentication → Sign In / Providers → Email → Confirm email, then sign in. " +
        "An existing account can also be confirmed by hand under Authentication → Users.",
    };
  }

  revalidatePath("/", "layout");
  redirect(AFTER_SIGN_IN);
}

/* ── Signing in ───────────────────────────────────────────────────────────── */

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!(await withinAttemptLimit("signin"))) return TOO_MANY;

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return describeAuthError(error);

  const next = safeReturnTo(formData.get("next")?.toString());
  revalidatePath("/", "layout");
  redirect(next);
}

/* ── Renaming yourself ────────────────────────────────────────────────────── */

/**
 * The one write Foundation ships, and it exists to prove the boundary end to
 * end: a signed-in account updating a column it is allowed to update, on the
 * row it owns, with ownership taken from the session and never from the form.
 */
export async function updateDisplayName(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const user = await requireUser();
  if (!(await withinAttemptLimit("rename"))) return TOO_MANY;

  const raw = formData.get("displayName")?.toString() ?? "";
  const parsed = raw.trim() === "" ? { success: true as const, data: null } : displayNameSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: "Check the details below.",
      fieldErrors: { displayName: parsed.error.issues[0]?.message ?? "That name cannot be used." },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);

  if (error) return { error: "That did not save. Try again." };

  revalidatePath("/", "layout");
  return { error: null, message: "Saved." };
}

/* ── Continuing with Google ───────────────────────────────────────────────── */

/**
 * Hand the browser to Google.
 *
 * `signInWithOAuth` does not sign anybody in. It builds the provider's
 * authorization URL, and — this is the part that only works on the server —
 * writes the PKCE code verifier into a cookie as a side effect. Google later
 * redirects back to `/auth/callback` with a `code`, and the exchange there
 * needs that verifier. A Server Action can set cookies; a Server Component
 * cannot, which is why this is an action and not something a page does while
 * rendering.
 *
 * `skipBrowserRedirect` because there is no browser here to redirect. We take
 * the URL and issue the redirect ourselves.
 *
 * Nothing about the account's role is decided here or anywhere in this file.
 * Google supplies an identity; the database supplies the role, and its default
 * is `learner` no matter what claims arrive.
 */
export async function signInWithGoogle(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!(await withinAttemptLimit("oauth"))) return TOO_MANY;

  const next = safeReturnTo(formData.get("next")?.toString());
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}${authCallbackPath(next)}`,
      skipBrowserRedirect: true,
      queryParams: {
        /*
         * Always show the account chooser. Without it Google silently reuses
         * whichever account the browser last used, which on a shared machine —
         * or for anybody with a work and a personal address — signs you in as
         * the wrong person with no way to notice.
         */
        prompt: "select_account",
      },
    },
  });

  if (error) {
    if ((error as AuthApiError).code === "validation_failed") {
      // What Supabase answers when the provider is not enabled on the project.
      return {
        error:
          "Google sign-in is not enabled on this Supabase project yet. " +
          "Enable it under Authentication → Sign In / Providers → Google.",
      };
    }
    return describeAuthError(error);
  }

  if (!data.url) {
    return { error: "Google sign-in is unavailable right now. Try again." };
  }

  // Outside any try/catch: `redirect` works by throwing, and a catch would
  // swallow the navigation and report it as a failure.
  redirect(data.url);
}

/* ── Signing out ──────────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  // Clears the router cache, so Back cannot paint a shell rendered for the
  // session that just ended.
  revalidatePath("/", "layout");
  redirect(SIGN_IN_PATH);
}
