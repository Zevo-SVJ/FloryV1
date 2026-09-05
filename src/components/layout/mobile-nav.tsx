"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavList } from "@/components/layout/nav-list";
import { LockMark } from "@/components/layout/lock-mark";
import { cn } from "@/lib/utils/cn";
import type { NavGroup } from "@/lib/lock/navigation";

/**
 * Navigation on a phone: a trigger in the top bar, and a drawer.
 *
 * Not a compressed sidebar. A 15rem column on a 375px screen leaves nothing for
 * the content, and a horizontally scrolling strip of twenty links across seven
 * groups loses the grouping that makes the product legible. So the same
 * `NavList` — same configuration, same component — moves into a panel that is
 * off screen until asked for.
 *
 * Written by hand rather than pulled from a library, and the four things a
 * library would have given us are each here on purpose:
 *
 *   · Escape closes it. The first thing anybody tries.
 *   · Focus moves into the panel on open and returns to the trigger on close,
 *     so a keyboard user is not left at the top of a document they cannot see.
 *   · The page behind it does not scroll while it is open.
 *   · Following a link closes it — otherwise the drawer covers the page it
 *     just navigated to.
 *
 * `aria-modal` with `role="dialog"`: content behind is inert to a screen reader
 * while it is open. There is no focus *trap* — that needs a full tab-cycle
 * implementation, and the honest trade is to say so rather than ship a broken
 * one. Tabbing past the last link reaches the browser chrome, which is
 * survivable; Escape and the close button are always one keystroke away.
 */
export function MobileNav({ groups, account }: { groups: NavGroup[]; account: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  /*
   * A navigation that happened some other way — the back button, a link inside
   * the page — must not leave the drawer sitting open over the route it just
   * moved to.
   *
   * Adjusted during render against the previous path rather than in an effect.
   * An effect would paint the drawer over the new page for one frame and then
   * close it, which is a visible flicker; React re-runs this component before
   * committing anything, so the drawer is simply never open on the new route.
   */
  const [pathAtRender, setPathAtRender] = useState(pathname);
  if (pathname !== pathAtRender) {
    setPathAtRender(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Into the panel, so the next Tab is the first link rather than the first
    // link of the page underneath.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Open navigation"
        className={
          "inline-flex size-11 items-center justify-center rounded-control " +
          "text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        }
      >
        <MenuIcon />
      </button>

      {/* Kept mounted so the transition has something to animate from, and
          hidden from assistive technology and from tab order when closed. */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
        /* React 19 types `inert` as a boolean and renders the attribute when
           true. It is what takes the closed panel out of the tab order — a
           drawer nobody can see is still focusable without it. */
        inert={!open}
      >
        <div
          onClick={close}
          className={cn(
            "absolute inset-0 bg-ink/20 transition-opacity duration-200 motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal={open || undefined}
          aria-label="Navigation"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col",
            "border-r border-border bg-surface outline-none",
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
            <LockMark href="/dashboard" className="pl-1" />
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation"
              className={
                "inline-flex size-11 items-center justify-center rounded-control " +
                "text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              }
            >
              <CloseIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <NavList groups={groups} onNavigate={() => setOpen(false)} />
          </div>

          {account}
        </div>
      </div>
    </>
  );
}

/* Two icons, inline. A dependency for eight path commands is a dependency to
   keep updated forever. `stroke="currentColor"` so both follow the theme. */

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}
