import Link from "next/link";
import { RANGES, RANGE_LABELS, type RangeId } from "@/lib/analytics/ranges";
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
 */
export function RangePicker({ active }: { active: RangeId }) {
  return (
    <nav aria-label="Date range" className="flex gap-1 overflow-x-auto rounded-control bg-surface-sunken p-1">
      {RANGES.map((range) => (
        <Link
          key={range}
          href={`/dashboard/analytics?range=${range}`}
          scroll={false}
          aria-current={range === active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-[7px] px-3 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
            range === active
              ? "bg-surface text-ink shadow-control"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {RANGE_LABELS[range]}
        </Link>
      ))}
    </nav>
  );
}
