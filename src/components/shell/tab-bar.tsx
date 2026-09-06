"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { Area } from "@/lib/lock/navigation";

/**
 * The phone's navigation: a floating tab bar, and a sheet for the rest.
 *
 * What it replaced was a hamburger that opened the desktop sidebar as a drawer
 * — the whole eighteen-link sitemap, slid in from the left. That is a desktop
 * pattern wearing a phone's clothes: two taps and a scan of seven headings to
 * reach the thing you use every day.
 *
 * Four tabs and More. They float over the content rather than sitting under it,
 * because the content should look like it continues beneath the navigation
 * instead of stopping at a footer. The material is the same one the rail uses,
 * so the two are recognisably the same layer of the product.
 *
 * The bar clears the home indicator with `env(safe-area-inset-bottom)`, and
 * every screen pads its foot by `.pb-tabbar` so nothing is ever trapped
 * underneath.
 */
export function TabBar({
  tabs,
  overflow,
  account,
}: {
  tabs: Area[];
  /** Areas that did not fit the bar. Reached through More, never hidden. */
  overflow: Area[];
  account: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isActive = (area: Area) =>
    [area.href, ...area.children.map((c) => c.href)].some(under);

  const overflowActive = overflow.some(isActive);

  /*
   * A navigation that happened some other way must not leave the sheet open
   * over the screen it just moved to. Adjusted during render rather than in an
   * effect: an effect would paint the sheet over the new screen for a frame.
   */
  const [pathAtRender, setPathAtRender] = useState(pathname);
  if (pathname !== pathAtRender) {
    setPathAtRender(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="fade-in absolute inset-0 bg-ink/25"
          />

          {/*
           * A sheet from the bottom, because that is where it was summoned
           * from. Arriving from the edge the control sits on is the whole of
           * spatial continuity on a phone.
           */}
          <div
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className={cn(
              "sheet-in absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto",
              "material rounded-t-sheet pb-safe shadow-[var(--shadow-material)]",
            )}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span aria-hidden className="h-1 w-9 rounded-full bg-ink/20" />
            </div>

            <div className="px-3 pb-4">
              <ul className="py-2">
                {overflow.map((area) => (
                  <li key={area.id}>
                    <Link
                      href={area.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "tactile flex min-h-[3.25rem] items-center gap-3.5 rounded-control px-3 text-[1.0625rem]",
                        isActive(area)
                          ? "bg-ink/[0.06] font-medium text-ink"
                          : "text-ink hover:bg-ink/[0.04]",
                      )}
                    >
                      <Icon
                        name={area.icon}
                        className={cn(
                          "size-[1.3rem]",
                          isActive(area) ? "text-accent" : "text-ink-subtle",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{area.label}</span>
                        <span className="block truncate text-footnote text-ink-subtle">
                          {area.summary}
                        </span>
                      </span>
                      <Icon name="forward" className="size-4 text-ink-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="rounded-card bg-ink/[0.03] p-1">{account}</div>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Sections"
        className="bottom-safe fixed inset-x-0 z-40 flex justify-center px-3 lg:hidden"
      >
        <ul className="material flex w-full max-w-md items-stretch gap-0.5 rounded-sheet p-1.5 shadow-[var(--shadow-material)]">
          {tabs.map((area) => {
            const active = isActive(area);
            return (
              <li key={area.id} className="min-w-0 flex-1">
                <Link
                  href={area.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tactile flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-control px-1",
                    active ? "text-accent" : "text-ink-subtle",
                  )}
                >
                  <Icon name={area.icon} className="size-[1.35rem]" />
                  <span
                    className={cn(
                      "w-full truncate text-center text-[0.625rem] leading-none tracking-[0.01em]",
                      active && "font-semibold",
                    )}
                  >
                    {area.label}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="min-w-0 flex-1">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={cn(
                "tactile flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-control px-1",
                overflowActive ? "text-accent" : "text-ink-subtle",
              )}
            >
              <Icon name="more" className="size-[1.35rem]" />
              <span
                className={cn(
                  "w-full truncate text-center text-[0.625rem] leading-none",
                  overflowActive && "font-semibold",
                )}
              >
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
