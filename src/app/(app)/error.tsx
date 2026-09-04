"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { StateBlock } from "@/components/states/state-block";

/**
 * The error boundary inside the shell.
 *
 * It offers signing out alongside retrying, and that second action is the point
 * of having a separate boundary here. The failure this catches most plausibly
 * is a session that is valid but whose profile cannot be read — `retry` loops
 * on that forever, and signing out is the only way a person gets themselves
 * out of it.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateBlock
      eyebrow="Error"
      tone="danger"
      title="This did not load."
      description="Trying again often works. If it keeps happening, sign out and back in."
      actions={
        <>
          <Button onClick={reset} size="sm">
            Try again
          </Button>
          <SignOutButton />
        </>
      }
    >
      {error.digest ? (
        <p className="label text-ink-subtle">Reference {error.digest}</p>
      ) : null}
    </StateBlock>
  );
}
