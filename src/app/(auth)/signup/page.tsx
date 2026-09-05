import type { Metadata } from "next";
import Link from "next/link";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";
import { signUp } from "@/lib/auth/actions";
import { SIGN_IN_PATH } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Create an account" };

/**
 * Creating an account.
 *
 * LOCK is private, and this page is how its accounts get made. The gate is not
 * in this codebase: once the accounts exist, signups are switched off in the
 * Supabase dashboard — which closes this form *and* Google, since a Google
 * sign-in for an unknown address is a signup. Both then answer that new
 * accounts are closed.
 *
 * That is deliberate. An invite-code system built now would be a feature nobody
 * asked for, guarding a door Supabase already has a lock on; the real one, an
 * admin who invites people, belongs in Prompt 6.
 *
 * The line about every account starting as a learner is not reassurance, it is
 * the actual behaviour: the role column defaults to `learner` and no signup
 * path — form or provider — can write it.
 */
export default function SignUpPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="label text-ink-subtle">Create account</p>
        <h1 className="text-title">Start building.</h1>
        <p className="text-sm text-ink-muted">
          Every new account starts as a learner.
        </p>
      </header>

      <div className="space-y-6">
        <GoogleButton label="Continue with Google" />
        <AuthDivider />
        <AuthForm mode="sign-up" action={signUp} />
      </div>

      <p className="text-sm text-ink-subtle">
        Already have one?{" "}
        <Link
          href={SIGN_IN_PATH}
          className="font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
