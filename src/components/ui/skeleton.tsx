import { cn } from "@/lib/utils/cn";

/**
 * A placeholder for something still arriving.
 *
 * Used only where the shape of what is coming is known and stable — a stat
 * card, a row of links, the editor's two columns. A skeleton that guesses
 * wrong is worse than a blank space: the layout jumps when the real thing
 * lands, which reads as a bug rather than as speed.
 *
 * The pulse is a background animation and nothing moves, so
 * `prefers-reduced-motion` reduces it to a flat tint rather than removing the
 * placeholder. `aria-hidden` throughout: the loading state is announced once,
 * by the container, not forty times by its parts.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block rounded-control bg-surface-sunken motion-safe:animate-pulse", className)}
    />
  );
}

/**
 * The wrapper that says "this screen is loading" once, out loud.
 *
 * A screen reader gets one polite announcement and a name for what is coming;
 * everything inside is decoration.
 */
export function LoadingScreen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
