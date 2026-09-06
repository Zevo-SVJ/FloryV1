import type { Metadata } from "next";
import Link from "next/link";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Notice } from "@/components/auth/notice";
import { signIn } from "@/lib/auth/actions";
import { authErrorMessage } from "@/lib/auth/auth-errors";
import { safeReturnTo } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Sign in" };

/**
 * `searchParams` is a Promise in Next.js 16 and must be awaited.
 *
 * Two parameters arrive here, both from outside, and neither is trusted:
 *
 *   `next`  — where to go afterwards. Run through `safeReturnTo`, which
 *             resolves it and refuses anything that leaves this origin. Checked
 *             again inside the action, because the hidden field it lands in is
 *             a field and a form is a thing a person can edit.
 *   `error` — why this page is being shown again. A key, never a provider's own
 *             text; `authErrorMessage` maps anything it does not recognise onto
 *             a generic sentence rather than rendering it.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const destination = safeReturnTo(next);
  const message = authErrorMessage(error);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="label text-ink-subtle">Sign in</p>
        <h1 className="text-title1">Welcome back.</h1>
      </header>

      {message ? <Notice tone="error">{message}</Notice> : null}

      <div className="space-y-6">
        <GoogleButton next={destination} label="Continue with Google" />
        <AuthDivider />
        <AuthForm mode="sign-in" action={signIn} next={destination} />
      </div>

      <p className="text-sm text-ink-subtle">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-ink underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-ink"
        >
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
