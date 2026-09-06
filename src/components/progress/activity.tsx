import { EmptyState } from "@/components/states/empty-state";
import { Group, Row } from "@/components/ui/list";
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
    <Group title={heading}>
      {entries.length === 0 ? (
        <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>
      ) : (
        entries.map((entry) => (
          <Row
            key={`${entry.source}-${entry.occurred_at}-${entry.title}`}
            align="start"
            title={entry.title}
            detail={entry.detail ?? undefined}
            trailing={
              <span className="hidden text-right sm:block">
                <span className="block">{SOURCE_LABEL[entry.source]}</span>
                <span className="mt-0.5 block font-mono tabular-nums">
                  {formatDate(entry.occurred_at)}
                </span>
              </span>
            }
          />
        ))
      )}
    </Group>
  );
}
