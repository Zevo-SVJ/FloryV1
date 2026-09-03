import { LoadingScreen, Skeleton } from "@/components/ui/skeleton";

/**
 * The editor, arriving.
 *
 * Two columns above `lg` and one below, matching the real layout exactly —
 * including the sticky save bar, which is the element a creator's eye goes to
 * first and the one whose absence would be most obvious.
 */
export default function EditorLoading() {
  return (
    <LoadingScreen label="Loading your page">
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-20" />
        </div>

        <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-4">
            <Skeleton className="h-10 w-full rounded-control" />
            <Skeleton className="h-64 w-full rounded-card" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((card) => (
                <Skeleton key={card} className="h-14 w-full rounded-card" />
              ))}
            </div>
          </div>

          <div className="hidden min-w-0 lg:block">
            <Skeleton className="mx-auto h-[34rem] w-full max-w-[22rem] rounded-[2rem]" />
          </div>
        </div>
      </div>
    </LoadingScreen>
  );
}
