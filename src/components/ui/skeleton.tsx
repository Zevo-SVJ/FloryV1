import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A placeholder for something still arriving.
 *
 * Used only where the shape of what is coming is known and stable. A skeleton
 * that guesses wrong is worse than a blank space: the layout jumps when the
 * real thing lands, which reads as a bug rather than as speed.
 *
 * `aria-hidden` throughout — the loading state is announced once, by the
 * container below, not forty times by its parts.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-control bg-surface-sunken motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

/** The wrapper that says "this screen is loading" once, out loud. */
export function LoadingScreen({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
