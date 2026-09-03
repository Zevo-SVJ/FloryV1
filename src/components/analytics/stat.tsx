import { cn } from "@/lib/utils/cn";

/**
 * One headline number.
 *
 * The comparison is the part worth being careful about. A percentage next to a
 * number is read as fact, so it appears only when there is a real previous
 * period with real activity in it; otherwise the space says why there is no
 * comparison rather than showing a confident 0%.
 */
export function Stat({
  label,
  value,
  change,
  comparable,
  hint,
}: {
  label: string;
  value: string;
  change?: number | null;
  comparable?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-[0.8125rem] text-ink-muted">{label}</p>
      <p className="mt-1.5 text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      <Comparison change={change} comparable={comparable} hint={hint} />
    </div>
  );
}

function Comparison({
  change,
  comparable,
  hint,
}: {
  change?: number | null;
  comparable?: boolean;
  hint?: string;
}) {
  if (hint) {
    return <p className="mt-2 text-[0.75rem] text-ink-subtle">{hint}</p>;
  }

  if (change === null || change === undefined) {
    return (
      <p className="mt-2 text-[0.75rem] text-ink-subtle">
        {comparable === false ? "No earlier period to compare" : "Not enough data"}
      </p>
    );
  }

  const rising = change > 0;
  const flat = change === 0;

  return (
    <p
      className={cn(
        "mt-2 text-[0.75rem] tabular-nums",
        flat ? "text-ink-subtle" : rising ? "text-success" : "text-danger",
      )}
    >
      {flat ? "No change" : `${rising ? "+" : ""}${change}%`}
      <span className="text-ink-subtle"> vs previous period</span>
    </p>
  );
}
