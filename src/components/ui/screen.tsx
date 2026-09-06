"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

const WIDTHS = {
  /* Prose. Stops where a line stops being comfortable to read. */
  read: "max-w-read",
  /* Overviews and lists. Wider, because scanning is not reading. */
  content: "max-w-content",
  /* Workspaces, where two things need to be visible at once. */
  wide: "max-w-wide",
} as const;

export type ScreenWidth = keyof typeof WIDTHS;

/**
 * Every screen in LOCK, from the toolbar down.
 *
 * One primitive, because the alternative — each page composing its own header —
 * is how twenty routes end up looking like twenty templates. It owns four
 * things:
 *
 * ── The large title, and its collapse ────────────────────────────────────────
 *
 * The title is set large in the content, and a compact copy of it appears in
 * the toolbar once you scroll past it. That is the iOS large-title behaviour,
 * and it is not decoration: it means a phone screen can give the title the
 * space it deserves on arrival and still tell you where you are three screens
 * down. A sentinel and an IntersectionObserver do it — no scroll handler, so
 * nothing runs on every frame.
 *
 * ── Width by task ────────────────────────────────────────────────────────────
 *
 * `read` for prose, `content` for overviews, `wide` for workspaces. The old
 * shell put one 64rem container around everything, which made a lesson too wide
 * to read and a mission workspace too narrow to work in.
 *
 * ── Back ─────────────────────────────────────────────────────────────────────
 *
 * A named parent, not a browser gesture. "Learn" beats "←" because it says
 * where back goes.
 *
 * ── Room for the tab bar ─────────────────────────────────────────────────────
 *
 * The phone's navigation floats over the content, so every screen ends with
 * enough padding to scroll its last element clear of it.
 */
export function Screen({
  title,
  eyebrow,
  lede,
  back,
  actions,
  width = "content",
  children,
  hideTitle = false,
}: {
  title: string;
  eyebrow?: ReactNode;
  lede?: ReactNode;
  back?: { href: string; label: string };
  /** Toolbar actions, trailing. Kept to one or two — this is not a ribbon. */
  actions?: ReactNode;
  width?: ScreenWidth;
  children: ReactNode;
  /**
   * For screens whose first element *is* the title — Home leads with the next
   * action set large, and a second heading above it would be a label on a label.
   * The toolbar still shows the compact title once you scroll.
   */
  hideTitle?: boolean;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry?.isIntersecting),
      /* Fires as the title passes under the toolbar, not as it leaves the
         viewport — the toolbar is ~3.5rem and floats. */
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-dvh">
      <header
        className={cn(
          "sticky top-0 z-30",
          /* The material only materialises once something is behind it.
             A permanent bar over an empty canvas is a bar for its own sake. */
          compact ? "material border-x-0 border-t-0" : "border-b border-transparent",
          "transition-[background-color,backdrop-filter,border-color] duration-[--duration-fast] motion-reduce:transition-none",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-14 w-full items-center gap-2 px-4 sm:px-6 lg:px-8",
            WIDTHS[width],
          )}
        >
          {back ? (
            <Link
              href={back.href}
              className={cn(
                "tactile -ml-2 flex h-9 items-center gap-1 rounded-control pr-2.5 pl-1.5",
                "text-[0.9375rem] text-accent hover:bg-ink/[0.04]",
              )}
            >
              <Icon name="back" className="size-[1.15rem]" strokeWidth="2" />
              <span className="max-w-[9rem] truncate">{back.label}</span>
            </Link>
          ) : null}

          <p
            className={cn(
              "min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold text-ink",
              "transition-opacity duration-[--duration-fast] motion-reduce:transition-none",
              compact ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!compact}
          >
            {title}
          </p>

          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full px-4 pb-tabbar sm:px-6 lg:px-8 lg:pb-24",
          WIDTHS[width],
        )}
      >
        <div ref={sentinel} aria-hidden className="h-px" />

        {hideTitle ? (
          <h1 className="sr-only">{title}</h1>
        ) : (
          <div className="rise pt-2 pb-8 sm:pb-10">
            {eyebrow ? (
              <div className="mb-2.5 text-footnote font-medium text-ink-subtle">{eyebrow}</div>
            ) : null}
            <h1 className="text-large">{title}</h1>
            {lede ? (
              <div className="mt-3 max-w-read text-body text-ink-muted">{lede}</div>
            ) : null}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

/**
 * A toolbar button: icon-only, and named for a screen reader.
 *
 * 36px on a pointer, 44 on touch — the smallest a fingertip reliably hits.
 */
export function ToolbarButton({
  icon,
  label,
  href,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = cn(
    "tactile flex size-11 items-center justify-center rounded-full sm:size-9",
    "text-ink-muted hover:bg-ink/[0.06] hover:text-ink",
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        <Icon name={icon} className="size-[1.15rem]" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      <Icon name={icon} className="size-[1.15rem]" />
    </button>
  );
}
