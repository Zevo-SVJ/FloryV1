import { cn } from "@/lib/utils";

/**
 * Blink's mark: a lens closing.
 *
 * Two mirrored arcs and a pupil — an eye at a glance, a shutter on second
 * look. It is drawn rather than lettered so it holds at 16px in a tab and at
 * 64px on a splash, and it belongs to Blink alone.
 */
export function BlinkMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-accent", className)}
      aria-hidden
    >
      <path
        d="M1.9 12C4.6 7.6 8.2 5.4 12 5.4S19.4 7.6 22.1 12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M1.9 12c2.7 4.4 6.3 6.6 10.1 6.6S19.4 16.4 22.1 12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  className,
  markSize = 20,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BlinkMark size={markSize} />
      <span className="display text-[1.0625rem] font-semibold tracking-[-0.035em] text-ink">
        Blink
      </span>
    </span>
  );
}
