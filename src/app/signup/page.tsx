import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Create your page",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-16">
      <Link
        href="/"
        className="w-fit rounded py-0.5 text-[0.9375rem] font-semibold tracking-tight"
      >
        ShowMe
      </Link>

      <h1 className="mt-10 text-title">Create your page</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Pick the address people will visit. It takes about thirty seconds.
      </p>

      <div className="mt-8">
        <AuthForm mode="sign-up" action={signUp} />
      </div>
    </main>
  );
}
