import { cn } from "@/lib/utils/cn";

/**
 * The one moving thing in LOCK.
 *
 * A ring with a gap, rotating. It inherits `currentColor`, so it is legible on
 * a solid button and on a plain surface without a variant for each, and it
 * stops under `prefers-reduced-motion` — the reduced-motion rule in
 * `globals.css` collapses the animation, leaving a static ring rather than
 * nothing, which still reads as "occupied".
 *
 * `aria-hidden`: the button it sits in announces the state in words.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full",
        "border-2 border-current border-t-transparent opacity-70",
        className,
      )}
    />
  );
}
