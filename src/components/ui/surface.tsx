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

/** The small monospace label that sits above a group. */
export function Label({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn("label text-ink-subtle", className)}>{children}</p>;
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
