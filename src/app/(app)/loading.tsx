import { LoadingScreen, Skeleton } from "@/components/ui/skeleton";

/**
 * What the shell shows while a section is on its way.
 *
 * Two bars and a block: the shape every section here shares — a heading, a line
 * of context, a body. Nothing more specific, because a skeleton that guesses
 * the wrong shape makes the layout jump when the real content lands.
 */
export default function Loading() {
  return (
    <LoadingScreen label="Loading">
      <div className="space-y-6 py-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-40 w-full" />
      </div>
    </LoadingScreen>
  );
}
