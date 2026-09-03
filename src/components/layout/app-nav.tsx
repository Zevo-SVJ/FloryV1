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
       * Spacing tightens below `sm` rather than anything being hidden. At 320px
       * the roomier version pushed "Sign out" past the right edge, and a phone
       * browser answers that by widening the layout viewport — which zooms the
       * whole app out instead of showing a scrollbar. Every control here is one
       * somebody needs, so the gaps give way and the controls stay.
       */}
      <div className="container-page flex h-16 items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link
            href="/dashboard"
            className="shrink-0 rounded text-[0.9375rem] font-semibold tracking-tight"
          >
            ShowMe
          </Link>
          <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
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
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/${profile.username}`}
            className="hidden rounded text-sm text-ink-subtle transition-colors hover:text-ink sm:block"
          >
            showme.at/{profile.username}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
