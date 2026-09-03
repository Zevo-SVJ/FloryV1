import { LoadingScreen, Skeleton } from "@/components/ui/skeleton";

/**
 * The dashboard, arriving.
 *
 * Shaped like the real screen — the address, the row of actions, the account
 * table — so nothing moves when the data lands. That is the whole test for
 * whether a skeleton is worth having; one that guesses the layout wrong trades
 * a blank moment for a visible jump.
 */
export default function DashboardLoading() {
  return (
    <LoadingScreen label="Loading your dashboard">
      <div className="max-w-2xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-8 w-full max-w-sm" />

        <div className="mt-6 flex flex-wrap gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="mt-10">
          <Skeleton className="h-4 w-20" />
          <div className="mt-3 space-y-px overflow-hidden rounded-card border border-border">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>
    </LoadingScreen>
  );
}
