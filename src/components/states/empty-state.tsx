import type { ReactNode } from "react";
import { Card } from "@/components/ui/surface";

/**
 * What an area says before it has anything in it.
 *
 * Empty states are first-class here, not an afterthought, because most of LOCK
 * is empty today and will be empty for a new learner on their first day either
 * way. "No data" tells somebody nothing they had not already worked out. These
 * say what the area is for, what will appear in it, and — where there is one —
 * what to do now.
 *
 * A dashed border rather than a solid card: it reads as a space reserved for
 * something rather than as a thing that is finished.
 */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  /** What will live here, in a sentence. Not a shrug. */
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`border-dashed bg-transparent p-6 ${className ?? ""}`}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">{title}</p>
        <div className="max-w-measure text-sm text-ink-muted">{children}</div>
      </div>
      {action ? <div className="pt-4">{action}</div> : null}
    </Card>
  );
}
