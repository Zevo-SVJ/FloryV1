import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Profile } from "@/types/database";

/**
 * The signed-in shell.
 *
 * Shows the address the creator's page will live at, because that is the thing
 * they came here for and the thing they will want to copy.
 */
export function AppNav({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-border">
      {/*
       * Spacing tightens below `sm` rather than anything being hidden, and
       * below `sm` the links wrap onto a row of their own.
       *
       * Four destinations, a wordmark and "Sign out" do not fit across 320px
       * at any spacing — adding "Optimize" was what proved it, by making the
       * shell overflow on every signed-in page at that width. A phone browser
       * answers an overflow by widening the layout viewport, which zooms the
       * whole app out rather than showing a scrollbar, so it is not a
       * cosmetic failure. Every control here is one somebody needs, so the
       * header becomes two rows instead of dropping one of them.
       */}
      <div className="container-page flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-3 sm:h-16 sm:flex-nowrap sm:gap-x-4 sm:py-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap sm:gap-x-6">
          <Link
            href="/dashboard"
            className="shrink-0 rounded py-0.5 text-[0.9375rem] font-semibold tracking-tight"
          >
            ShowMe
          </Link>
          <nav className="order-last flex w-full items-center gap-0.5 text-sm sm:order-none sm:w-auto sm:gap-1">
            <Link
              href="/dashboard"
              className="rounded-control px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:px-3"
            >
              Dashboard
            </Link>
            <Link
              href="/editor"
              className="rounded-control px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:px-3"
            >
              Editor
            </Link>
            <Link
              href="/dashboard/analytics"
              className="rounded-control px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:px-3"
            >
              Stats
            </Link>
            {/*
              * "Optimize" rather than "Smart Optimization": the nav has to fit
              * four items and an address on a 320px screen, and the long name
              * is the page's own heading where there is room for it.
              */}
            <Link
              href="/dashboard/optimize"
              className="rounded-control px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:px-3"
            >
              Optimize
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/${profile.username}`}
            className="hidden rounded py-0.5 text-sm text-ink-subtle transition-colors hover:text-ink sm:block"
          >
            showme.at/{profile.username}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
