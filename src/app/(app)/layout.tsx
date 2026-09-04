import type { ReactNode } from "react";
import { LockMark } from "@/components/layout/lock-mark";
import { SectionNav } from "@/components/layout/section-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Badge } from "@/components/ui/surface";
import { requireProfile } from "@/lib/auth/dal";
import { sectionsFor } from "@/lib/lock/navigation";

/**
 * The application shell.
 *
 * Two jobs, and the order matters. First it insists on a session and a profile:
 * `requireProfile()` runs here, next to the render, and redirects if there is
 * none. The proxy already turned away signed-out visitors, but the proxy is a
 * convenience — this is the check that counts, and every route inside this
 * group inherits it by being inside it.
 *
 * Second it draws the frame: the wordmark, the sections this role may see, and
 * the account. Which links exist is decided here, on the server, from a role
 * read out of the database — not in the browser, and not from anything the
 * browser sent.
 *
 * The role badge is shown to everybody. On a platform where what you can reach
 * depends on what you are, that is worth stating rather than leaving people to
 * infer it from a missing link.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const sections = sectionsFor(profile.role);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[80rem] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <LockMark href="/dashboard" />
            <Badge tone={profile.role === "learner" ? "quiet" : "accent"}>
              {profile.role}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {profile.display_name ?? "Your account"}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[80rem] flex-col gap-8 px-6 py-6 md:flex-row md:gap-10 md:py-10">
        <aside className="md:w-sidebar md:shrink-0">
          <SectionNav sections={sections} />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
