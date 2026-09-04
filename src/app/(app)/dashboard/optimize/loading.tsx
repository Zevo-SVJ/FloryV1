import { LoadingScreen, Skeleton } from "@/components/ui/skeleton";

/**
 * Smart Optimization, arriving.
 *
 * Five aggregates and a page read in parallel, so this is on screen for about
 * as long as the analytics page's skeleton is. The shape below is the real
 * one: the score panel, then cards.
 */
export default function OptimizeLoading() {
  return (
    <LoadingScreen label="Working out what to suggest">
      <div className="max-w-3xl space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-4 w-full max-w-xl" />

        <Skeleton className="h-28 rounded-card" />

        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    </LoadingScreen>
  );
}
