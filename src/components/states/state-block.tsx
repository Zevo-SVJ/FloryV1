import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * One shape for every "there is nothing here, and here is why" moment.
 *
 * Empty, error, unauthorized, not-found and not-built-yet are the same
 * component with different words, because they are the same thing to the person
 * reading them: an explanation and, where one exists, a way out. Building them
 * separately is how a product ends up with five different apologies.
 *
 * `tone` changes exactly one thing — the colour of the eyebrow. A failure is
 * not a reason to redesign the page.
 */

export type StateTone = "neutral" | "danger";

export function StateBlock({
  eyebrow,
  title,
  description,
  tone = "neutral",
  actions,
  children,
  className,
}: {
  /** The small monospace line above the title: "Not found", "Error", "Planned". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  tone?: StateTone;
  /** Buttons or links. Left out entirely when there is nothing useful to offer. */
  actions?: ReactNode;
  /** Anything the specific state needs below the copy. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-measure flex-col items-start gap-4 py-16",
        className,
      )}
    >
      {eyebrow ? (
        <p className={cn("label", tone === "danger" ? "text-danger" : "text-ink-subtle")}>
          {eyebrow}
        </p>
      ) : null}

      <div className="space-y-3">
        <h1 className="text-title">{title}</h1>
        {description ? <div className="text-lede text-ink-muted">{description}</div> : null}
      </div>

      {children}

      {actions ? <div className="flex flex-wrap gap-3 pt-2">{actions}</div> : null}
    </div>
  );
}
