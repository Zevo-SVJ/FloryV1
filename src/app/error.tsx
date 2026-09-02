"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * The error boundary for the whole app.
 *
 * Shows a sentence and a retry, never a stack. The `digest` is included
 * because it is the only handle a person has when reporting a production error
 * — it correlates their screenshot with a line in the server log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side digests are logged by the platform; this catches the rest.
    console.error(error);
  }, [error]);

  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center py-16 text-center">
      <h1 className="text-title">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-[0.9375rem] text-ink-muted">
        That did not load. Trying again usually works — if it does not, it is on
        our side.
      </p>

      <div className="mt-8">
        <Button onClick={reset} size="sm">
          Try again
        </Button>
      </div>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-ink-subtle">
          Reference {error.digest}
        </p>
      ) : null}
    </main>
  );
}
