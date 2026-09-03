import { cn } from "@/lib/utils/cn";

/**
 * A ranked breakdown, as bars behind labels.
 *
 * Chosen over a donut because the question a creator asks is "which is
 * biggest, and by how much" — which a sorted list answers by reading order and
 * a pie answers by making somebody compare angles. It also degrades: at 320px
 * this is still a list, where a chart would be a smudge.
 *
 * The bar is a background on the row rather than a separate element, so the
 * label always sits on top of its own proportion and nothing wraps oddly when
 * a country name is long.
 */
export function Bars({
  rows,
  empty,
  unit = "views",
}: {
  rows: { key: string; label: string; views: number; share: number; icon?: string }[];
  empty: string;
  unit?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-ink-subtle">{empty}</p>;
  }

  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.key} className="relative overflow-hidden rounded-control">
          {/*
            * Decorative: the number beside the label already says this, and a
            * screen reader reading "62 percent" twice is worse than once.
            */}
          <span
            aria-hidden
            style={{ width: `${Math.max(row.share, 1.5)}%` }}
            className="absolute inset-y-0 left-0 bg-surface-sunken"
          />
          <span className="relative flex items-baseline gap-2 px-2.5 py-2 text-[0.8125rem]">
            {row.icon ? (
              <span aria-hidden className="shrink-0">
                {row.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-ink">{row.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">{row.share}%</span>
            <span className="sr-only">
              {row.views} {unit}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A titled box, used for every panel below the headline numbers. */
export function Panel({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-border bg-surface p-4", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {note ? <p className="text-[0.75rem] text-ink-subtle">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
