import { cn } from "@/lib/utils/cn";
import type { SeriesPoint } from "@/lib/analytics/queries";

/**
 * Views and clicks over time, as two bars per bucket.
 *
 * No charting library. This is a bar per day with a shared scale, and the
 * libraries that draw it well weigh forty to a hundred kilobytes — on a
 * dashboard a creator opens from a phone to answer one question. Flexbox and
 * a percentage height do the same job in a component small enough to read.
 *
 * Deliberately grouped bars rather than two stacked charts: the question is
 * almost always "did clicks follow views", and putting them side by side in
 * one column answers it without moving your eyes between two grids.
 *
 * The visual is `aria-hidden` and a real table sits beside it in `sr-only`.
 * A bar chart communicates nothing to a screen reader however many labels it
 * carries, and a table communicates everything — so the chart is decoration
 * over data rather than the only copy of it.
 */
export function Chart({
  series,
  bucket,
}: {
  series: SeriesPoint[];
  bucket: "hour" | "day";
}) {
  if (series.length === 0) {
    return (
      <p className="py-10 text-center text-[0.8125rem] text-ink-subtle">
        Nothing recorded in this period yet.
      </p>
    );
  }

  /*
   * One scale for both series, so a column's two bars are comparable to each
   * other and to every other column. Scaling them separately would make three
   * clicks look like thirty views.
   */
  const peak = Math.max(1, ...series.map((point) => Math.max(point.views, point.clicks)));

  const format = (at: Date) =>
    bucket === "hour"
      ? at.toLocaleTimeString(undefined, { hour: "numeric" })
      : at.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  /* Enough labels to orient, few enough to fit at 320px. */
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div>
      <div aria-hidden className="flex h-40 items-end gap-[3px]">
        {series.map((point) => (
          <div key={point.at.toISOString()} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-[2px]">
              <Bar value={point.views} peak={peak} className="bg-ink/80" />
              <Bar value={point.clicks} peak={peak} className="bg-accent" />
            </div>
          </div>
        ))}
      </div>

      <div aria-hidden className="mt-2 flex gap-[3px]">
        {series.map((point, index) => (
          <div
            key={point.at.toISOString()}
            className="min-w-0 flex-1 truncate text-center text-[0.6875rem] text-ink-subtle"
          >
            {index % labelEvery === 0 ? format(point.at) : " "}
          </div>
        ))}
      </div>

      <div aria-hidden className="mt-3 flex items-center gap-4 text-[0.75rem] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-ink/80" /> Views
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px] bg-accent" /> Clicks
        </span>
      </div>

      {/*
        * The same numbers, in the form a screen reader can actually use. Not a
        * summary or an aria-label full of commas — the whole series, as a
        * table, which is what the picture is.
        */}
      <table className="sr-only">
        <caption>Views and clicks over time</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Views</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.at.toISOString()}>
              <th scope="row">{format(point.at)}</th>
              <td>{point.views}</td>
              <td>{point.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One bar.
 *
 * A minimum height of two pixels for any non-zero value: a single view on a
 * chart whose peak is four hundred rounds to nothing, and "nothing" and "one"
 * are the two numbers a creator most needs to tell apart early on. A true zero
 * stays invisible.
 */
function Bar({ value, peak, className }: { value: number; peak: number; className: string }) {
  if (value === 0) return <span className="w-full max-w-2.5" />;

  return (
    <span
      style={{ height: `max(2px, ${(value / peak) * 100}%)` }}
      className={cn("w-full max-w-2.5 rounded-[2px]", className)}
      title={`${value}`}
    />
  );
}
