"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { Area } from "@/lib/lock/navigation";

const STORAGE_KEY = "lock:rail-collapsed";

/**
 * The collapsed preference, as an external store.
 *
 * `useSyncExternalStore` rather than an effect that calls `setState`. Reading
 * `localStorage` during render breaks hydration; reading it in an effect and
 * setting state is a cascading render React now warns about. This is the
 * primitive built for the case — the server snapshot is "expanded", the client
 * snapshot is whatever was stored, and React reconciles the difference itself.
 * Listening to `storage` also keeps two tabs in agreement for free.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* Private browsing. The rail still works; it just forgets. */
    return false;
  }
}

function writeCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* Ignored for the same reason. */
  }
  for (const listener of listeners) listener();
}

/**
 * The desktop navigation: a rail that floats, not a panel that occupies.
 *
 * What it replaced was a full-height column with a border down its right edge,
 * its own background, seven headings and eighteen links — a permanent piece of
 * furniture that took the first fifteen rems of every screen and read as an
 * admin console. The product is a place to read and think; its navigation
 * should be reachable and otherwise invisible.
 *
 * So: six destinations, one per area, floating on the canvas with a material
 * behind it rather than a wall beside the content. Collapsible to icons, and
 * the choice is remembered — on a laptop at 1280 the extra ten rems of content
 * is the difference between a comfortable reading column and a cramped one.
 *
 * Secondary destinations are deliberately absent. Artifacts belongs to My SaaS
 * and is reached from inside it. A sidebar that lists every page is a sitemap,
 * and a sitemap is what you give someone who is lost.
 */
export function SideRail({
  areas,
  account,
}: {
  areas: Area[];
  /** The account block, rendered by the server so a role is never decided here. */
  account: ReactNode;
}) {
  const pathname = usePathname();
  const isCollapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  /* Width is transitioned, so the first-paint correction from the server's
     "expanded" to a stored "collapsed" reads as a movement, not a jump. */
  const toggle = () => writeCollapsed(!isCollapsed);

  return (
    <div
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col p-3 lg:flex",
        "transition-[width] duration-[--duration-base] ease-[--ease-out] motion-reduce:transition-none",
        isCollapsed ? "w-[4.75rem]" : "w-[15.5rem]",
      )}
    >
      <nav
        aria-label="Sections"
        data-collapsed={isCollapsed}
        className="group/rail material flex h-full flex-col rounded-card p-2 shadow-[var(--shadow-material)]"
      >
        <div
          className={cn(
            "flex h-11 items-center",
            isCollapsed ? "justify-center" : "justify-between px-2",
          )}
        >
          {isCollapsed ? null : (
            <Link
              href="/dashboard"
              className="font-mono text-[0.8125rem] font-semibold tracking-[0.24em] text-ink"
            >
              LOCK
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-pressed={isCollapsed}
            className="tactile flex size-8 items-center justify-center rounded-control text-ink-subtle hover:bg-ink/5 hover:text-ink"
          >
            <Icon name="sidebar" className="size-[1.05rem]" />
          </button>
        </div>

        <ul className="mt-2 flex-1 space-y-0.5">
          {areas.map((area) => {
            const hrefs = [area.href, ...area.children.map((c) => c.href)];
            const active = hrefs.some(
              (href) => pathname === href || pathname.startsWith(`${href}/`),
            );

            return (
              <li key={area.id}>
                <Link
                  href={area.href}
                  aria-current={active ? "page" : undefined}
                  title={isCollapsed ? area.label : area.summary}
                  className={cn(
                    "tactile relative flex h-10 items-center gap-3 rounded-control text-[0.9375rem]",
                    isCollapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "bg-ink/[0.06] font-medium text-ink"
                      : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
                  )}
                >
                  {/* The selected marker is a shape, not only a tint: a bar on
                      the leading edge survives both themes and a screenshot. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 h-5 w-[3px] rounded-full bg-accent",
                      "transition-opacity duration-[--duration-fast] motion-reduce:transition-none",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Icon
                    name={area.icon}
                    className={cn("size-[1.15rem]", active && "text-accent")}
                  />
                  {isCollapsed ? (
                    <span className="sr-only">{area.label}</span>
                  ) : (
                    <span className="truncate">{area.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-[var(--color-material-border)] pt-1">{account}</div>
      </nav>
    </div>
  );
}
