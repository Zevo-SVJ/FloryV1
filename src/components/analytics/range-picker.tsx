import Link from "next/link";
import { RANGES, RANGE_LABELS, RANGE_SHORT_LABELS, type RangeId } from "@/lib/analytics/ranges";
import { cn } from "@/lib/utils/cn";

/**
 * Which period the whole page is about.
 *
 * Links rather than a client-side control, so the range lives in the URL. That
 * makes it shareable, survives a reload, gives the back button something to do,
 * and keeps the dashboard a Server Component with no state to synchronise —
 * every number below is rendered for one window because the request was.
 *
 * `aria-current="page"` rather than a pressed button: these navigate.
 *
 * A five-column grid, not a scrolling row. It used to be a flex row with
 * `overflow-x-auto`, and the full labels needed 362px — so on a 390px phone
 * the last option was off the edge and reachable only by swiping a control
 * that gives no hint it can be swiped. Equal columns fit every width from
 * 320px up, and the compact labels are what an analytics control is called
 * anyway; the accessible name carries the full words for anyone who cannot see
 * that this is a row of five.
 */
export function RangePicker({ active }: { active: RangeId }) {
  return (
    <nav
      aria-label="Date range"
      className="grid grid-cols-5 gap-1 rounded-control bg-surface-sunken p-1"
    >
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/dashboard/analytics?range=${range}`}
          scroll={false}
          aria-current={range === active ? "page" : undefined}
          aria-label={RANGE_LABELS[range]}
          className={cn(
            "rounded-[7px] px-2 py-1.5 text-center text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
            range === active
              ? "bg-surface text-ink shadow-control"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {RANGE_SHORT_LABELS[range]}
        </Link>
      ))}
    </nav>
  );
}
