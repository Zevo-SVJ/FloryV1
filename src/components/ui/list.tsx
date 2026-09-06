import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

/**
 * Grouped lists: the shape most of this product should be made of.
 *
 * The pattern every system list uses, and for a good reason — a group of rows
 * on one surface, separated by hairlines that stop short of the edge, reads as
 * *one thing containing several* rather than as several things that happen to
 * be adjacent. A card per row says the opposite, which is why the previous
 * interface scanned as a wall: twelve equal rectangles, no relationships.
 *
 * Three pieces:
 *
 *   Group      the surface, the corner radius, and an optional heading
 *   Row        one line of it, as text
 *   LinkRow    the same, as a destination, with the chevron that says so
 *
 * The separators are inset to align with the row's text, not with the surface's
 * edge. That inset is the detail that makes a list look drawn rather than
 * generated.
 */

export function Group({
  title,
  footnote,
  action,
  children,
  className,
}: {
  /** A heading above the group, outside its surface. Sentence case, quiet. */
  title?: ReactNode;
  /** A line under the group explaining it. Where the fine print goes. */
  footnote?: ReactNode;
  /** A control on the heading's trailing edge. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title || action ? (
        <div className="mb-2.5 flex items-end justify-between gap-4 px-1">
          {title ? (
            <h2 className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card bg-surface shadow-[var(--shadow-control)]">
        {children}
      </div>

      {footnote ? (
        <p className="mt-2.5 px-1 text-footnote text-ink-subtle">{footnote}</p>
      ) : null}
    </section>
  );
}

/**
 * A row's contents, shared by the static and the linked versions.
 *
 * `leading` is for a mark or an icon, `trailing` for a value or a chevron. The
 * separator is drawn by the row itself rather than by `divide-y` on the parent,
 * so a row can be conditionally rendered without leaving a stray line behind.
 */
function RowBody({
  leading,
  title,
  detail,
  trailing,
  align = "center",
}: {
  leading?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <>
      {leading ? (
        <span className={cn("shrink-0", align === "start" && "pt-0.5")}>{leading}</span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] leading-snug font-medium text-ink">
          {title}
        </span>
        {detail ? (
          <span className="mt-1 block text-subhead leading-normal text-ink-muted">
            {detail}
          </span>
        ) : null}
      </span>

      {trailing ? (
        <span
          className={cn(
            "flex shrink-0 items-center gap-2 text-footnote text-ink-subtle",
            align === "start" && "pt-0.5",
          )}
        >
          {trailing}
        </span>
      ) : null}
    </>
  );
}

const ROW = "flex w-full items-center gap-3.5 px-4 py-3.5 text-left";
/* The inset hairline. `first:before:hidden` keeps the top of the group clean. */
const SEPARATOR =
  "relative before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-separator first:before:hidden";

export function Row({
  leading,
  title,
  detail,
  trailing,
  align,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div className={cn(ROW, SEPARATOR, align === "start" && "items-start", className)}>
      <RowBody
        leading={leading}
        title={title}
        detail={detail}
        trailing={trailing}
        align={align}
      />
    </div>
  );
}

export function LinkRow({
  href,
  external,
  leading,
  title,
  detail,
  trailing,
  align,
  className,
}: {
  href: string;
  /** Opens in a new tab, and says so with the icon rather than in words. */
  external?: boolean;
  leading?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  const content = (
    <>
      <RowBody
        leading={leading}
        title={title}
        detail={detail}
        trailing={trailing}
        align={align}
      />
      <Icon
        name={external ? "external" : "forward"}
        className="size-4 shrink-0 text-ink-subtle transition-transform duration-[--duration-fast] group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </>
  );

  const classes = cn(
    ROW,
    SEPARATOR,
    "group tactile hover:bg-ink/[0.025] active:bg-ink/[0.05]",
    align === "start" && "items-start",
    className,
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

/**
 * A value on the trailing edge of a row: mono, so numbers line up down a column.
 */
export function RowValue({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-footnote tabular-nums text-ink-muted">{children}</span>
  );
}
