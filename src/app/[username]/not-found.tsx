import { ButtonLink } from "@/components/ui/button";

/**
 * A username nobody has claimed.
 *
 * Worth its own not-found rather than the app-wide one: a visitor here
 * mistyped a creator's name or followed a dead bio link, and the useful next
 * step is to claim the name themselves.
 */
export default function ProfileNotFound() {
  return (
    <main className="container-profile flex min-h-dvh flex-col items-center justify-center py-16 text-center">
      <h1 className="text-title">This page does not exist</h1>
      <p className="mt-3 max-w-sm text-[0.9375rem] text-ink-muted">
        Nobody has claimed this address yet. Check the spelling, or take it for
        yourself.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/signup" size="sm">
          Claim this address
        </ButtonLink>
        <ButtonLink href="/" size="sm" variant="secondary">
          ShowMe home
        </ButtonLink>
      </div>
    </main>
  );
}
