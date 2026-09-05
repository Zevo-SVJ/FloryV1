import { cn } from "@/lib/utils/cn";

/**
 * A bar, and the only place LOCK draws a filled shape in the accent colour.
 *
 * Deliberately capable of showing nothing. Progress in LOCK is not tracked yet,
 * so this renders an empty track with an honest label rather than a number
 * somebody invented — and when the learning engine arrives, the same component
 * takes a real `value` with no change to how it looks.
 *
 * `role="progressbar"` with the aria value attributes, so the state is
 * available to a screen reader rather than implied by a coloured rectangle.
 */
export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  /** Null when there is nothing to report. Renders an empty track. */
  value: number | null;
  max: number;
  /** Required: a bar with no accessible name is a decoration. */
  label: string;
  className?: string;
}) {
  const known = value !== null && max > 0;
  const percent = known ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      {...(known ? { "aria-valuenow": value } : { "aria-valuetext": "Not tracked yet" })}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
