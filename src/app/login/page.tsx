import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "@/lib/auth/actions";
import { safeReturnTo } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const { next, notice } = await searchParams;
  // Validated here as well as in the action: this value ends up in a hidden
  // field, and an unchecked one would make the form an open redirect.
  const returnTo = safeReturnTo(next);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-16">
      <Link
        href="/"
        // `w-fit py-0.5`: the wordmark is a standalone navigation target, and at
        // its natural line height it was a 23px-tall thing to hit. Two pixels
        // of padding take it to the 24px minimum without moving anything.
        className="w-fit rounded py-0.5 text-[0.9375rem] font-semibold tracking-tight"
      >
        ShowMe
      </Link>

      <h1 className="mt-10 text-title">Sign in</h1>
      <p className="mt-2 text-sm text-ink-muted">Welcome back.</p>

      {/*
        * The one thing `/auth/callback` can send somebody back here to be
        * told. A confirmation link that has expired or already been used
        * otherwise redirects in silence, which reads as the link having done
        * nothing at all. `notice` is compared against a known value rather
        * than rendered, so nothing from the query string reaches the page.
        */}
      {notice === "link-expired" ? (
        <p
          role="status"
          className="mt-4 rounded-control bg-surface-sunken px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-muted"
        >
          That link has expired or was already used. Sign in below, or sign up again to get a
          fresh one.
        </p>
      ) : null}

      <div className="mt-8">
        <AuthForm mode="sign-in" action={signIn} next={returnTo} />
      </div>
    </main>
  );
}
