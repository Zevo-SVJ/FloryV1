"use client";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";

/**
 * The error boundary for every signed-in screen.
 *
 * Narrower than the root boundary on purpose, because the failures that happen
 * inside the app shell have a different recovery. A dashboard that will not
 * load is usually a session or a database problem, and the two things worth
 * offering are "try again" and "sign out" — the second being the only exit
 * from an account whose profile row has gone missing, which used to be a
 * redirect loop with no way out at all.
 *
 * No stack, no digest interpretation, no SQL. The reference is the digest the
 * platform logged, which is the only handle a person has when reporting this.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-title">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
        We could not load your account just now. Trying again usually works. If
        it keeps happening, signing out and back in will reset your session.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} size="sm">
          Try again
        </Button>
        <SignOutButton />
      </div>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-ink-subtle">Reference {error.digest}</p>
      ) : null}
    </div>
  );
}
