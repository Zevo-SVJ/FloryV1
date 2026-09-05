import { Card, Label } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { formatDate } from "@/components/progress/award";
import type { LearnerActivityRow } from "@/types/database";

/**
 * What happened, newest first.
 *
 * Assembled by `learner_activity` from records that already existed — the build
 * log, lesson completions, milestones — rather than from an event table built
 * for this feed. There is no second history to keep in step with the first.
 *
 * The source is shown as a word rather than an icon set, for the same reason
 * the rest of the interface avoids them: three glyphs would need a legend.
 */
const SOURCE_LABEL: Record<LearnerActivityRow["source"], string> = {
  build_log: "Build",
  lesson: "Learn",
  milestone: "Milestone",
};

export function ActivityFeed({
  entries,
  heading = "Recent activity",
  emptyTitle = "Your LOCK journey starts here",
  emptyBody = "Lessons you finish, work you submit and milestones you reach appear here as they happen.",
}: {
  entries: readonly LearnerActivityRow[];
  heading?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  return (
    <section className="space-y-3">
      <Label as="h2">{heading}</Label>

      {entries.length === 0 ? (
        <EmptyState title={emptyTitle}>
          <p>{emptyBody}</p>
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {entries.map((entry) => (
            <article
              key={`${entry.source}-${entry.occurred_at}-${entry.title}`}
              className="space-y-1 p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="label text-ink-subtle">{SOURCE_LABEL[entry.source]}</span>
                <span className="label text-ink-subtle tabular-nums">
                  {formatDate(entry.occurred_at)}
                </span>
              </div>
              <p className="text-[0.9375rem] text-ink">{entry.title}</p>
              {entry.detail ? (
                <p className="max-w-measure text-sm text-ink-muted">{entry.detail}</p>
              ) : null}
            </article>
          ))}
        </Card>
      )}
    </section>
  );
}
