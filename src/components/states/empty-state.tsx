import type { ReactNode } from "react";

/**
 * What an area says before it has anything in it.
 *
 * Empty states are first-class here, not an afterthought, because most of LOCK
 * is empty today and will be empty for a new learner on their first day either
 * way. "No data" tells somebody nothing they had not already worked out. These
 * say what the area is for, what will appear in it, and — where there is one —
 * what to do now.
 *
 * Centred text on the surface it is empty *of*, with no box around it. The
 * dashed rectangle it replaced drew a hard edge around an absence, which made
 * "nothing here yet" look like a component that had failed to load. An empty
 * list should look like a list with nothing in it.
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
    <div className={`px-4 py-10 text-center ${className ?? ""}`}>
      <p className="text-title3">{title}</p>
      <div className="mx-auto mt-2 max-w-read text-subhead text-ink-muted">{children}</div>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
