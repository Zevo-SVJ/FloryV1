import type { ReactNode } from "react";
import { LockMark } from "@/components/layout/lock-mark";

/**
 * The frame around signing in and signing up.
 *
 * A single centred column, nothing else on screen. There is one decision to
 * make on these pages and everything else is a distraction from it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col px-6">
      <header className="py-8">
        <LockMark href="/" />
      </header>
      <div className="flex flex-1 flex-col justify-center pb-24">{children}</div>
    </main>
  );
}
