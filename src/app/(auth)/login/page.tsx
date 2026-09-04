import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "@/lib/auth/actions";
import { safeReturnTo } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Sign in" };

/**
 * `searchParams` is a Promise in Next.js 16 and must be awaited.
 *
 * `next` is read here and passed through `safeReturnTo`, which resolves it and
 * refuses anything that leaves this origin. It is checked again on the way out
 * of the action — the hidden field it lands in is a field, and a form is a
 * thing a person can edit.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-title">Sign in</h1>
        <p className="text-sm text-ink-muted">Continue where you left off.</p>
      </div>

      <AuthForm mode="sign-in" action={signIn} next={safeReturnTo(next)} />

      <p className="text-sm text-ink-subtle">
        No account?{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-4">
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
