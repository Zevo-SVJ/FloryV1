import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A card, and the label that titles one.
 *
 * A border rather than a shadow. Cards are the most repeated shape in an
 * interface like this, and a page of floating panels reads as a template;
 * shadows are kept for things that genuinely float.
 */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-card border border-border bg-surface", className)}>
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
  tone?: "quiet" | "accent";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "label inline-flex items-center rounded-full px-2 py-1",
        tone === "accent"
          ? "bg-accent-quiet text-accent"
          : "bg-surface-sunken text-ink-subtle",
      )}
    >
      {children}
    </span>
  );
}
