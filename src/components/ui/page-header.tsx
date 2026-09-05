import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The top of every page in the shell.
 *
 * One component rather than a heading written out per page, because the
 * alignment between the eyebrow, the title and the description is the thing
 * that makes twenty pages read as one application. Hard-coding it per page is
 * how a product ends up with twenty slightly different headers.
 *
 * `meta` and `action` are optional and usually absent. A header with a button
 * on every page is a header nobody reads.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  action,
  className,
}: {
  /** The section this page belongs to: MY SAAS, LEARN. Set in the monospace. */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Counts, statuses, dates — the technical line under the description. */
  meta?: ReactNode;
  /** At most one primary action. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-border pb-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2">
          {eyebrow ? <p className="label text-ink-subtle">{eyebrow}</p> : null}
          <h1 className="text-title">{title}</h1>
          {description ? (
            <p className="max-w-measure text-ink-muted">{description}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {meta ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">{meta}</div>
      ) : null}
    </header>
  );
}

/**
 * One fact in a header's metadata row: a monospace label over a value.
 *
 * This is where the monospace earns its keep — a countable, a status, a phase
 * number. Prose stays in the sans face.
 */
export function HeaderMeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="label text-ink-subtle">{label}</p>
      <p className="text-sm text-ink">{children}</p>
    </div>
  );
}
