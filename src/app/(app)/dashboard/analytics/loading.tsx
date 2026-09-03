import { LoadingScreen, Skeleton } from "@/components/ui/skeleton";

/**
 * Analytics, arriving.
 *
 * Seven aggregates run in parallel, so this is on screen for as long as the
 * slowest one — which makes it the loading state most worth shaping properly.
 * The four stat cards and the chart are the fixed part of the layout; the
 * panels below are sketched at their real heights.
 */
export default function AnalyticsLoading() {
  return (
    <LoadingScreen label="Loading your analytics">
      <div className="max-w-3xl space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-full max-w-sm" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-20 rounded-card" />
          ))}
        </div>

        <Skeleton className="h-56 rounded-card" />
        <Skeleton className="h-40 rounded-card" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    </LoadingScreen>
  );
}
