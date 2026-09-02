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
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="rounded text-[0.9375rem] font-semibold tracking-tight">
            ShowMe
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded-control px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              Dashboard
            </Link>
            <Link
              href="/editor"
              className="rounded-control px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              Editor
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
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
