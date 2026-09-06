import type { SVGProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The icon set, drawn here rather than installed.
 *
 * Twenty-odd glyphs on one grid, one stroke weight, one join style. A library
 * would give us six hundred icons in six visual dialects and a dependency to
 * keep current; what the product actually needs is a small vocabulary that
 * looks like it was drawn by one hand.
 *
 * The rules, in the spirit of SF Symbols rather than in imitation of it:
 *
 *   · one 24-unit grid, so weights and optical sizes agree
 *   · 1.75 stroke, round caps and joins, no fills except where a shape *is* a
 *     fill (the completion tick's disc)
 *   · sized in `em` off the surrounding text, so an icon beside a label scales
 *     with it instead of being pinned to a pixel size
 *   · `currentColor` throughout, so state is the parent's business
 *   · decorative by default: `aria-hidden`, because an icon next to its own
 *     label read aloud twice is worse than an icon not read at all. Pass
 *     `title` when the icon is the only thing naming a control.
 */

export type IconName =
  | "home"
  | "learn"
  | "build"
  | "toolbox"
  | "progress"
  | "mentor"
  | "more"
  | "back"
  | "forward"
  | "close"
  | "check"
  | "circle"
  | "lock"
  | "play"
  | "list"
  | "sidebar"
  | "search"
  | "sparkle"
  | "note"
  | "clock"
  | "target"
  | "external";

const PATHS: Record<IconName, React.ReactNode> = {
  /* A roof and a door: the one glyph everybody already reads as "start". */
  home: <path d="M3.6 10.4 12 3.8l8.4 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-3.6v-6h-6.8v6H5a1.4 1.4 0 0 1-1.4-1.4Z" />,
  /* Stacked leaves — a programme you work through, not a mortarboard. */
  learn: (
    <>
      <path d="M3.4 7.4 12 3.6l8.6 3.8L12 11.2Z" />
      <path d="M20.6 11.6 12 15.4 3.4 11.6" />
      <path d="M20.6 15.8 12 19.6 3.4 15.8" />
    </>
  ),
  /* A cube in progress. The product being assembled, not a hammer. */
  build: (
    <>
      <path d="M12 3.4 20 7.7v8.6L12 20.6 4 16.3V7.7Z" />
      <path d="M4 7.7 12 12l8-4.3M12 12v8.6" />
    </>
  ),
  /* A case with a handle. A drawer of things, opened when needed. */
  toolbox: (
    <>
      <path d="M3.4 8.6h17.2v10a1.4 1.4 0 0 1-1.4 1.4H4.8a1.4 1.4 0 0 1-1.4-1.4Z" />
      <path d="M9 8.6V6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 6v2.6" />
      <path d="M3.4 13.4h17.2" />
    </>
  ),
  /* Rings, in the spirit of an activity ring rather than a bar chart. */
  progress: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6a8.4 8.4 0 0 1 8.4 8.4" strokeWidth="2.6" />
    </>
  ),
  /* A person, and the speech that comes back. */
  mentor: (
    <>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  back: <path d="M14.6 5.4 8 12l6.6 6.6" />,
  forward: <path d="M9.4 5.4 16 12l-6.6 6.6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 12.6 9.6 17 19 7.4" />,
  circle: <circle cx="12" cy="12" r="8.2" />,
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="9.6" rx="2.2" />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </>
  ),
  play: <path d="M8.6 5.6 18 12l-9.4 6.4Z" />,
  list: (
    <>
      <path d="M9 6.6h11M9 12h11M9 17.4h11" />
      <path d="M4.4 6.6h.01M4.4 12h.01M4.4 17.4h.01" strokeWidth="2.4" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.6" />
      <path d="M9.6 4.6v14.8" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4 4" />
    </>
  ),
  sparkle: <path d="M12 3.6 13.9 9 19.4 11 13.9 13 12 18.4 10.1 13 4.6 11 10.1 9Z" />,
  note: (
    <>
      <path d="M5.4 4.6h13.2v14.8H5.4Z" />
      <path d="M8.6 9h6.8M8.6 13h4.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6V12l3 1.8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  external: (
    <>
      <path d="M13.6 5.4h5v5" />
      <path d="m18.6 5.4-7.6 7.6" />
      <path d="M18 14.4v3.6a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V7.6A1.6 1.6 0 0 1 6 6h3.6" />
    </>
  ),
};

export function Icon({
  name,
  title,
  className,
  ...rest
}: {
  name: IconName;
  /** Give this only when the icon alone names a control. */
  title?: string;
} & Omit<SVGProps<SVGSVGElement>, "name" | "title">) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[1.15em] shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

/**
 * The completion mark, which is a shape rather than a colour.
 *
 * Three states and each one has a different silhouette, so it survives a
 * monochrome screen and a colour-blind reader: a filled disc with a tick, a
 * ring with the accent, an empty ring. The number lives inside the empty ring,
 * which is what makes a list of lessons read as an ordered sequence rather than
 * as a set of checkboxes.
 */
export function StatusMark({
  state,
  index,
  className,
}: {
  state: "done" | "current" | "todo" | "locked";
  index?: number;
  className?: string;
}) {
  if (state === "done") {
    return (
      <span
        aria-label="Completed"
        className={cn(
          "flex size-6 items-center justify-center rounded-full bg-ink text-ink-inverse",
          className,
        )}
      >
        <Icon name="check" className="size-[0.85rem]" strokeWidth="2.6" />
      </span>
    );
  }

  if (state === "locked") {
    return (
      <span
        aria-label="Locked"
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-ink-subtle ring-1 ring-border",
          className,
        )}
      >
        <Icon name="lock" className="size-[0.8rem]" strokeWidth="2" />
      </span>
    );
  }

  return (
    <span
      aria-label={state === "current" ? "Up next" : undefined}
      className={cn(
        "flex size-6 items-center justify-center rounded-full text-[0.6875rem] font-medium tabular-nums ring-1",
        state === "current"
          ? "bg-accent/10 text-accent ring-accent"
          : "text-ink-subtle ring-border-strong",
        className,
      )}
    >
      {index !== undefined ? index : null}
    </span>
  );
}
