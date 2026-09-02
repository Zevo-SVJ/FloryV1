import { ButtonLink } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { getUser } from "@/lib/auth/dal";
import { AFTER_SIGN_IN } from "@/lib/auth/routes";

/**
 * The landing page.
 *
 * A placeholder on purpose — the marketing site is a later phase. It exists so
 * the root route is not a 404 and so the header's signed-in state has somewhere
 * to be exercised.
 */
export default async function HomePage() {
  const user = await getUser();

  return (
    <>
      <SiteHeader />

      <main className="container-page flex min-h-[calc(100dvh-4rem)] flex-col justify-center py-20">
        <div className="max-w-2xl">
          <h1 className="text-display">One page for everything you make.</h1>

          <p className="mt-6 max-w-lg text-lede text-ink-muted">
            ShowMe gives you a single address to send people to — your links,
            your work, your socials — that loads instantly and looks like you
            made it on purpose.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {user ? (
              <ButtonLink href={AFTER_SIGN_IN}>Go to dashboard</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/signup">Claim your page</ButtonLink>
                <ButtonLink href="/login" variant="secondary">
                  Sign in
                </ButtonLink>
              </>
            )}
          </div>

          <p className="mt-10 font-mono text-sm text-ink-subtle">showme.at/you</p>
        </div>
      </main>
    </>
  );
}
