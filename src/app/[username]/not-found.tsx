import { ButtonLink } from "@/components/ui/button";

/**
 * A username nobody has claimed.
 *
 * Worth its own not-found rather than the app-wide one: whoever is here
 * mistyped a creator's name or followed a link from a bio that has since
 * changed, and the useful next step is to take the name themselves.
 *
 * It says nothing about why. "No profile found for that username" and "the
 * database is unreachable" are different situations, and only the first ever
 * reaches this page — the second becomes a 500, on purpose, so a search engine
 * does not de-index a real creator during an outage.
 */
export default function ProfileNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em]">
        This ShowMe page doesn&rsquo;t exist
      </h1>

      <p className="mt-3 max-w-[32ch] text-[0.9375rem] leading-relaxed text-ink-muted">
        Nobody has claimed this address. Check the spelling, or take it for
        yourself.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/signup" size="sm">
          Claim this address
        </ButtonLink>
        <ButtonLink href="/" size="sm" variant="secondary">
          What is ShowMe?
        </ButtonLink>
      </div>
    </main>
  );
}
