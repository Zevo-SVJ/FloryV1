import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "@/lib/auth/actions";
import { SIGN_IN_PATH } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Create an account" };

/**
 * Creating an account.
 *
 * LOCK is private, and this page is how its accounts get made. The gate is not
 * in this codebase: once the accounts exist, signups are switched off in the
 * Supabase dashboard, and this form then returns "New accounts are closed."
 *
 * That is deliberate. An invite-code system built now would be a feature
 * nobody asked for, guarding a door Supabase already has a lock on — and the
 * real one, an admin who invites people, belongs in Prompt 6 with the rest of
 * administration. `SETUP.md` says to throw the switch.
 */
export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-title">Create an account</h1>
        <p className="text-sm text-ink-muted">
          Every new account starts as a learner.
        </p>
      </div>

      <AuthForm mode="sign-up" action={signUp} />

      <p className="text-sm text-ink-subtle">
        Already have one?{" "}
        <Link
          href={SIGN_IN_PATH}
          className="font-medium text-ink underline underline-offset-4"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
