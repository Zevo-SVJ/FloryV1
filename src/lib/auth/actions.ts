"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError, type AuthApiError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { requireUser } from "@/lib/auth/dal";
import { AFTER_SIGN_IN, ONBOARDING_PATH, SIGN_IN_PATH, safeReturnTo } from "@/lib/auth/routes";
import { checkAvailability } from "@/lib/usernames/availability";
import { credentialsSchema, signInSchema } from "@/lib/validation/schemas";
import { usernameSchema } from "@/lib/validation/username";
import type { AuthField, FormState } from "@/lib/auth/form-state";

/**
 * Sign up, sign in, choose a username, sign out.
 *
 * These are reachable by direct POST, not only through the forms that call
 * them, so each one validates its own input and never trusts a field it did
 * not derive from the session.
 *
 * The shape is what `useActionState` expects: the previous state first, a
 * `FormState` back. Errors are returned rather than thrown so the form can put
 * a sentence next to the field that caused it. `FormState` itself lives in
 * `form-state.ts`, because a `"use server"` module may only export async
 * functions.
 */

const NOT_CONFIGURED: FormState = {
  error:
    "ShowMe is not connected to a database yet. Add your Supabase keys to .env.local and restart.",
};

/** Turn a Zod failure into per-field messages the form can render. */
function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): FormState {
  const fieldErrors: FormState["fieldErrors"] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "email" || field === "password" || field === "username") {
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
 * enumeration oracle, and the accounts here are people's public identities.
 */
function describeAuthError(error: AuthError): FormState {
  const code = (error as AuthApiError).code ?? "";

  switch (code) {
    case "invalid_credentials":
      return { error: "That email and password do not match an account." };
    case "email_not_confirmed":
      return {
        error: "Confirm your email address first — check your inbox for the link.",
      };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { error: "Too many attempts. Wait a minute and try again." };
    case "user_already_exists":
    case "email_exists":
      // Same wording as a successful signup that needs confirmation, so this
      // cannot be used to discover which addresses have accounts.
      return { error: "That email address cannot be used. Try signing in instead." };
    case "weak_password":
      return {
        error: "Check the details below.",
        fieldErrors: { password: "That password is too easy to guess." },
      };
    case "signup_disabled":
      return { error: "New accounts are closed at the moment." };
    default:
      break;
  }

  if (error.status === 429) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  /*
   * A username that was free during the check and taken by the time the row
   * was inserted surfaces here: the trigger that creates the profile hits the
   * unique index, the whole signup transaction rolls back, and GoTrue reports
   * a generic database failure. Rare, but the only honest reading of it.
   */
  if (error.status === 500) {
    return {
      error: "Check the details below.",
      fieldErrors: {
        username: "That username was taken a moment ago. Try another.",
      },
    };
  }

  return { error: "Something went wrong signing you in. Try again." };
}

/* ── Signing up ───────────────────────────────────────────────────────────── */

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = credentialsSchema
    .extend({ username: usernameSchema })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      username: formData.get("username"),
    });

  if (!parsed.success) return fieldErrorsFrom(parsed.error.issues);

  const { email, password, username } = parsed.data;

  /*
   * Checked again on the server, because the browser's answer is a courtesy
   * and this one is not. It is still not the guarantee — see below.
   */
  const availability = await checkAvailability(username);
  if (availability.state === "taken" || availability.state === "reserved") {
    return {
      error: "Check the details below.",
      fieldErrors: { username: availability.message ?? "That username is not available." },
    };
  }

  const supabase = await createClient();

  /*
   * The username travels with the account. A trigger on `auth.users` reads it
   * back out of `raw_user_meta_data` and creates the profile inside the same
   * transaction, so there is no moment where an account exists without a page,
   * and no second request that could fail on its own.
   *
   * If the name was taken in the milliseconds since the check above, the
   * unique index rejects it, the transaction rolls back, and no orphaned
   * account is left behind. `describeAuthError` turns that into a message
   * pointing at the username field.
   */
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${siteUrl()}${AFTER_SIGN_IN}`,
    },
  });

  if (error) return describeAuthError(error);

  /*
   * With email confirmation switched on, Supabase returns a user but no
   * session — the account exists and is waiting on a click in an inbox. The
   * username is already claimed, so nobody can take it in the meantime.
   */
  if (!data.session) {
    return {
      error: null,
      message: `Check your inbox to confirm your email. showme.at/${username} is being held for you.`,
    };
  }

  revalidatePath("/", "layout");
  redirect(AFTER_SIGN_IN);
}

/* ── Signing in ───────────────────────────────────────────────────────────── */

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

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

/* ── Choosing a username after the fact ──────────────────────────────────── */

/**
 * Claim a username for the signed-in account.
 *
 * The path for an account that arrived without one — created from the Supabase
 * dashboard, or by a signup that predates this flow. The normal signup never
 * reaches here.
 *
 * Ownership comes from the session, never from the form: the update is keyed
 * on `auth.uid()`, and Row Level Security would refuse it even if it were not.
 */
export async function claimUsername(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const user = await requireUser(ONBOARDING_PATH);

  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    return {
      error: "Check the details below.",
      fieldErrors: { username: parsed.error.issues[0]?.message ?? "That username cannot be used." },
    };
  }

  const username = parsed.data;

  const availability = await checkAvailability(username);
  if (availability.state === "taken" || availability.state === "reserved") {
    return {
      error: "Check the details below.",
      fieldErrors: { username: availability.message ?? "That username is not available." },
    };
  }

  const supabase = await createClient();

  /*
   * `username_claimed_at is null` in the predicate makes this claim-once at the
   * statement level: two tabs racing produce one update and one no-op, rather
   * than two writes where the second silently wins. The trigger stamps
   * `username_claimed_at` itself — a client that could set it could reset
   * itself to unclaimed and rename freely.
   */
  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id)
    .is("username_claimed_at", null)
    .select("username")
    .maybeSingle();

  if (error) {
    // 23505: somebody claimed it between the check and this statement. The
    // index is the authority, and this is the answer it gave.
    if (error.code === "23505") {
      return {
        error: "Check the details below.",
        fieldErrors: { username: "That username was taken a moment ago. Try another." },
      };
    }
    return { error: "That did not save. Try again." };
  }

  // No row updated means the account already has a chosen username — another
  // tab got there first. Nothing is wrong; go to the dashboard.
  if (!data) {
    revalidatePath("/", "layout");
    redirect(AFTER_SIGN_IN);
  }

  revalidatePath("/", "layout");
  redirect(AFTER_SIGN_IN);
}

/* ── Signing out ──────────────────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  // Clears the router cache, so a Back press cannot paint a dashboard rendered
  // for the session that just ended.
  revalidatePath("/", "layout");
  redirect(SIGN_IN_PATH);
}
