import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A card, and the label that titles one.
 *
 * A surface and a hairline shadow, not a border. The border version made every
 * group on a page an equal-weight rectangle; an elevation step reads as "this
 * is one thing" without drawing a line around it. Most places that used to
 * reach for a card should now reach for `Group` in `ui/list` — a card is for a
 * single object, a group is for a list of them.
 */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-card bg-surface shadow-[var(--shadow-control)]", className)}>
      {children}
    </div>
  );
}

/**
 * The small monospace label that sits above a group.
 *
 * `as` exists because this one style plays two roles. Above a `<section>` it is
 * the section's *title*, and rendering it as a paragraph left every page going
 * straight from `h1` to the `h3` inside a card — a screen-reader user
 * navigating by heading could not reach a single section on the dashboard. Above
 * a field or inside a sentence it is not a heading and must not pretend to be
 * one, so the default stays `p`.
 *
 * Passing `as="h2"` changes the semantics only. The appearance is identical,
 * which is the point: the visual language does not have a separate "heading"
 * treatment to apply.
 */
export function Label({
  as: Tag = "p",
  className,
  children,
}: {
  /** `h2` when this titles a section. `p` otherwise. */
  as?: "p" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("label text-ink-subtle", className)}>{children}</Tag>;
}

/**
 * A status chip.
 *
 * `quiet` is the default and the one used most: a fact, not an alarm.
 */
export function Badge({
  tone = "quiet",
  children,
}: {
  tone?: "quiet" | "accent" | "success";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-caption font-medium",
        tone === "accent" && "bg-accent/12 text-accent",
        tone === "success" && "bg-success/12 text-success",
        tone === "quiet" && "bg-ink/[0.06] text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}
