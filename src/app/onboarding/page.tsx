import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsernameForm } from "@/components/auth/username-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireProfile } from "@/lib/auth/dal";
import { AFTER_SIGN_IN } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Choose your username",
  robots: { index: false, follow: false },
};

/**
 * The one screen an unfinished account sees.
 *
 * Reached by an account that has a session but no chosen username — created
 * from the Supabase dashboard, or by a signup that predates this flow. The
 * normal signup claims the name in the same transaction as the account and
 * never lands here.
 *
 * Deliberately outside the `(app)` group: that layout redirects here when a
 * username is unclaimed, and a page inside it would redirect to itself forever.
 */
export default async function OnboardingPage() {
  const profile = await requireProfile();

  // Already finished — arriving here by typing the URL, or with a stale tab.
  if (profile.username_claimed_at) redirect(AFTER_SIGN_IN);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-16">
      <h1 className="text-title">Choose your username</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This is your address on ShowMe. It cannot be changed yet, so pick one you
        will want to hand out.
      </p>

      <div className="mt-8">
        <UsernameForm />
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
