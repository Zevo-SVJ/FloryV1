"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * A sheet: transient content that arrives from an edge and leaves the same way.
 *
 * One component for what would otherwise be two — a bottom sheet on a phone, a
 * side panel on a Mac. Same content, same state, same code; only the edge it
 * arrives from changes, because the edge is what makes it feel like it came
 * from somewhere rather than appearing.
 *
 * Written by hand rather than pulled from a library, and the four things a
 * library would have given us are each here on purpose:
 *
 *   · Escape closes it, and focus returns to the trigger.
 *   · The page behind it does not scroll while it is open.
 *   · The backdrop is a button, so a pointer and a screen reader both have a
 *     way out that is not the keyboard.
 *   · It is not rendered at all when closed, so it costs nothing and cannot be
 *     reached by Tab.
 *
 * There is no focus *trap*. That needs a full tab-cycle implementation, and the
 * honest trade is to say so rather than ship a broken one: tabbing past the
 * last control reaches the browser chrome, which is survivable, and Escape and
 * the close button are always one keystroke away.
 */
export function Sheet({
  trigger,
  title,
  children,
}: {
  /** Rendered by the caller, so the button belongs to the toolbar it sits in. */
  trigger: (props: { onClick: () => void; "aria-expanded": boolean }) => ReactNode;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.querySelector("button")?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.querySelector("button")?.focus();
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
      <div ref={triggerRef} className="contents">
        {trigger({ onClick: () => setOpen(true), "aria-expanded": open })}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={close}
            className="fade-in absolute inset-0 bg-ink/25"
          />

          <div
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "material absolute flex flex-col shadow-[var(--shadow-material)]",
              /* Phone: up from the bottom, capped so the page stays visible
                 behind it — a sheet that fills the screen is a page. */
              "sheet-in inset-x-0 bottom-0 max-h-[78dvh] rounded-t-sheet pb-safe",
              /* Wide: in from the side, full height, because there is room. */
              "sm:inset-y-3 sm:right-3 sm:bottom-3 sm:left-auto sm:w-[22rem] sm:max-h-none sm:rounded-sheet sm:pb-0",
            )}
          >
            <div className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2 sm:pt-4">
              <span
                aria-hidden
                className="absolute inset-x-0 top-2.5 mx-auto h-1 w-9 rounded-full bg-ink/20 sm:hidden"
              />
              <h2 className="min-w-0 flex-1 truncate pt-2 text-title3 sm:pt-0">{title}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="tactile flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-ink/[0.06] hover:text-ink"
              >
                <Icon name="close" className="size-[1.05rem]" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
