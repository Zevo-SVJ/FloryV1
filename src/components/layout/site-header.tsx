import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/auth/dal";
import { AFTER_SIGN_IN } from "@/lib/auth/routes";

/**
 * The marketing header.
 *
 * A Server Component, so the signed-in state is correct in the first byte of
 * HTML — no flash of "Sign in" for somebody who already is.
 */
export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="border-b border-border">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="rounded py-0.5 text-[0.9375rem] font-semibold tracking-tight">
          ShowMe
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <ButtonLink href={AFTER_SIGN_IN} size="sm" variant="secondary">
              Dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" size="sm" variant="ghost">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
