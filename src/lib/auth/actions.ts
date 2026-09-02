"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { AFTER_SIGN_IN, SIGN_IN_PATH, safeReturnTo } from "@/lib/auth/routes";
import { credentialsSchema, signInSchema } from "@/lib/validation/schemas";
import type { FormState } from "@/lib/auth/form-state";

/**
 * Sign up, sign in, sign out.
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
    if (field === "email" || field === "password") {
      fieldErrors[field] ??= issue.message;
    }
  }
  return { error: "Check the details below.", fieldErrors };
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error.issues);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${siteUrl()}${AFTER_SIGN_IN}` },
  });

  if (error) return { error: error.message };

  /*
   * With email confirmation switched on, Supabase returns a user but no
   * session — the account exists and is waiting on a click in an inbox. Saying
   * so beats redirecting to a dashboard that will bounce them straight back.
   */
  if (!data.session) {
    return {
      error: null,
      message: "Check your inbox to confirm your email, then sign in.",
    };
  }

  revalidatePath("/", "layout");
  redirect(AFTER_SIGN_IN);
}

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

  // Supabase deliberately does not say which half was wrong, and neither do we:
  // a distinct "no such account" reply is an account-enumeration oracle.
  if (error) return { error: "That email and password do not match an account." };

  const next = safeReturnTo(formData.get("next")?.toString());
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect(SIGN_IN_PATH);
}
