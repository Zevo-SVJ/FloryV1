"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";

/**
 * The error boundary for everything outside the app shell.
 *
 * It says almost nothing about the error, and that is not evasion: Next.js
 * strips the message from a production build and hands the boundary a `digest`
 * instead, so anything printed here beyond that digest would be a message this
 * component invented. The digest is what matches this render to a line in the
 * server log, so it is shown.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The one place the real error exists in production. Replace with whatever
    // reporting LOCK ends up using; until then the platform's log is the record.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-read px-6">
      <StateBlock
        eyebrow="Error"
        tone="danger"
        title="Something went wrong."
        description="This is on our side, not yours. Trying again often works."
        actions={
          <>
            <Button onClick={reset} size="sm">
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary" size="sm">
              Back to the start
            </ButtonLink>
          </>
        }
      >
        {error.digest ? (
          <p className="label text-ink-subtle">Reference {error.digest}</p>
        ) : null}
      </StateBlock>
    </main>
  );
}
