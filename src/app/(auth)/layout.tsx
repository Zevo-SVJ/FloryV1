import type { ReactNode } from "react";
import { LockMark } from "@/components/layout/lock-mark";
import { PHASES } from "@/lib/lock/phases";

/**
 * The frame around signing in.
 *
 * Two columns from `lg` up: the program on the left, the decision on the right.
 * One column below that, with the left panel gone rather than stacked — on a
 * phone it would push the form under the fold, and the form is the only reason
 * anybody is here.
 *
 * The left panel is the ten phases. That is a deliberate choice over the usual
 * furniture of a sign-in screen — a gradient, a product screenshot, a testimonial
 * — because it is the one thing on this page that is true and specific to LOCK.
 * It is also the answer to "what is this?" for the only people who will ever see
 * it. Set in the monospace at label size with two-digit numbers, it reads as a
 * manifest rather than as decoration.
 *
 * No card, no shadow, no floating panel. The form sits on the canvas with room
 * around it.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,30rem)]">
      {/* The program. Presentational, and skipped by a screen reader on its way
          to the form — the same information is on the entry page, and hearing
          ten phase names before reaching a password field is a tax. */}
      <aside
        aria-hidden
        className="hidden border-r border-border bg-surface-sunken lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
      >
        <LockMark />

        <div className="max-w-[34ch] space-y-10">
          <p className="text-title">
            You are the founder. The tools are the execution layer.
          </p>

          <ol className="space-y-2.5">
            {PHASES.map((phase) => (
              <li key={phase.key} className="flex items-baseline gap-4">
                <span className="label w-6 shrink-0 text-ink-subtle tabular-nums">
                  {String(phase.number).padStart(2, "0")}
                </span>
                <span className="label text-ink-muted">{phase.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="label text-ink-subtle">Private · invitation only</p>
      </aside>

      {/* The decision. */}
      <main className="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:min-h-0 lg:justify-center lg:px-12 xl:px-16">
        <div className="lg:hidden">
          <LockMark href="/" />
        </div>

        <div className="flex flex-1 flex-col justify-center py-12 lg:flex-none lg:py-0">
          <div className="w-full max-w-[22rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}
