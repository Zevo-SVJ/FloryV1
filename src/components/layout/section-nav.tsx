"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { Section } from "@/lib/lock/navigation";

/**
 * The section list in the shell.
 *
 * A Client Component for one reason — `usePathname`, to mark the current
 * section — and it receives the sections it may draw as a prop rather than
 * working them out. That is the boundary that matters: which links exist is a
 * function of the role, the role is read on the server, and no part of that
 * decision is made in the browser.
 *
 * A section that is not built yet is still linked, and marked. Hiding it would
 * make the shape of the program invisible; a dot is enough.
 */
export function SectionNav({ sections }: { sections: Section[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      /* One list, two layouts: a horizontal strip that scrolls on a phone, a
         column in the sidebar from `md` up. Rendering it twice would be two
         copies of the same links for a screen reader to read out. */
      className="-mx-1 flex gap-0.5 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0"
    >
      {sections.map((section) => {
        const active =
          pathname === section.href || pathname.startsWith(`${section.href}/`);

        return (
          <Link
            key={section.href}
            href={section.href}
            title={section.summary}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm transition-colors md:justify-between",
              active
                ? "bg-accent-quiet font-medium text-ink"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
            )}
          >
            <span>{section.label}</span>
            {section.status === "planned" ? (
              <span
                aria-label="not built yet"
                title="Not built yet"
                className="size-1.5 shrink-0 rounded-full bg-border-strong"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
