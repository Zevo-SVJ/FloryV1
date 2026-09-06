import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { LockMark } from "@/components/layout/lock-mark";

/**
 * The 404, for anything outside the app shell.
 *
 * The shell has its own at `(app)/not-found.tsx`, which keeps the navigation in
 * place — losing the navigation is what makes a mistyped URL feel like a
 * crash.
 */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-read px-6">
      <div className="py-8">
        <LockMark href="/" />
      </div>
      <StateBlock
        eyebrow="404"
        title="There is nothing at this address."
        description="The link may be out of date, or the page may not have been built yet."
        actions={
          <ButtonLink href="/" size="sm">
            Back to the start
          </ButtonLink>
        }
      />
    </main>
  );
}
