"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { NavGroup } from "@/lib/lock/navigation";

/**
 * The navigation itself: groups, headings, links.
 *
 * One component, rendered twice — once in the desktop sidebar, once inside the
 * mobile drawer. That is the whole reason it is separate from either: two
 * copies of a link list is how a product ends up with a section that exists on
 * a laptop and not on a phone.
 *
 * A Client Component for one reason, `usePathname`, to mark where you are. The
 * groups it may draw arrive as a prop, already filtered by role on the server.
 * Which links exist is never decided in the browser.
 *
 * A `planned` page is still linked, and marked with a dot. Hiding it would make
 * the shape of the product invisible; a dot says "not yet" without a sentence.
 */
export function NavList({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  /** Lets the mobile drawer close itself when a link is followed. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="space-y-6">
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          <h2 className="label px-3 text-ink-subtle">{group.label}</h2>

          <ul className="space-y-0.5">
            {group.items.map((item) => {
              /*
               * Exact match, or a real path segment beneath it. `startsWith`
               * alone would light up Roadmap (`/learn`) while you are reading
               * `/learners`, and would light up both Roadmap and Lessons at
               * once on `/learn/lessons`.
               */
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.summary}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-control px-3 py-2 text-sm transition-colors",
                      /* 44px on a phone, tighter on a pointer device. */
                      "min-h-11 md:min-h-0 md:py-1.5",
                      active
                        ? "bg-accent-quiet font-medium text-ink"
                        : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
