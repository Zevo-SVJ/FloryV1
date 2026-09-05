import type { ReactNode } from "react";
import { LockMark } from "@/components/layout/lock-mark";
import { NavList } from "@/components/layout/nav-list";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AccountBlock } from "@/components/layout/account-block";
import { requireProfile, getUser } from "@/lib/auth/dal";
import { navGroupsFor } from "@/lib/lock/navigation";

/**
 * The application shell.
 *
 * Two jobs, and the order matters.
 *
 * First it insists on a session and a profile. `requireProfile()` runs here,
 * next to the render, and redirects if there is none. The proxy already turned
 * signed-out visitors away, but the proxy is a convenience — this is the check
 * that counts, and every route inside this group inherits it by being inside
 * it.
 *
 * Second it draws the frame. Which links exist is decided here, on the server,
 * from a role read out of the database — never in the browser, and never from
 * anything the browser sent. `navGroupsFor` is called once and the result is
 * handed to both the sidebar and the mobile drawer, so the two cannot disagree
 * about what this account may see.
 *
 * The layout is a sticky sidebar beside a normally scrolling document above
 * `lg`, and a top bar with a drawer below it.
 *
 * The sidebar is `sticky` with its own `h-dvh` rather than the grid being
 * `h-dvh` with `overflow-hidden`. That was the first attempt and it clipped:
 * a single implicit grid row is sized `auto`, so it grew past the container's
 * height and the last navigation group was cut off the bottom of the screen
 * with no way to scroll to it. Sticky puts the height on the element that needs
 * it, leaves the page's own scrollbar to the content, and cannot clip.
 *
 * `min-w-0` on `main` is what stops a wide table or a long unbroken string in a
 * child page from pushing the whole document sideways — a grid item's default
 * minimum width is its content.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const user = await getUser();
  const groups = navGroupsFor(profile.role);
  const account = <AccountBlock profile={profile} email={user?.email ?? null} />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--spacing-sidebar)_1fr]">
      {/* Desktop: a quiet column that does not scroll with the content. */}
      <aside className="hidden border-r border-border bg-surface-sunken lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <LockMark href="/dashboard" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <NavList groups={groups} />
        </div>

        {account}
      </aside>

      {/* Mobile: a bar that stays put, and the drawer behind its trigger. */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-canvas px-3 lg:hidden">
        <MobileNav groups={groups} account={account} />
        <LockMark href="/dashboard" />
      </header>

      <main className="min-w-0">
        {/*
         * One content measure for the whole application. Pages set their own
         * internal rhythm and never their own page padding, which is what keeps
         * twenty routes from looking like twenty templates.
         */}
        <div className="mx-auto w-full max-w-[64rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
