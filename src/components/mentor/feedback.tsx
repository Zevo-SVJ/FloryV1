import { Card, Label, Badge } from "@/components/ui/surface";
import { FEEDBACK_CATEGORY_LABEL } from "@/lib/mentor/labels";
import { ARTIFACT_STATUS_LABEL } from "@/lib/workspace/labels";
import type { ArtifactFeedbackRow } from "@/types/database";

/**
 * One review, as the learner reads it.
 *
 * Four headings, always in the same order, because the order is the argument:
 * what worked, what did not, why that matters, what to do next. A learner
 * should be able to close this page knowing what to change without rereading.
 *
 * Empty fields are omitted rather than shown blank — an approval with nothing
 * to fix should not render two empty sections.
 */
export function FeedbackCard({ feedback }: { feedback: ArtifactFeedbackRow }) {
  const returned = feedback.status === "needs_work";

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <Badge tone={returned ? "quiet" : "accent"}>
          {ARTIFACT_STATUS_LABEL[feedback.status]}
        </Badge>
        <span className="label text-ink-subtle">
          {FEEDBACK_CATEGORY_LABEL[feedback.category]}
        </span>
        <span className="label text-ink-subtle tabular-nums">
          {new Date(feedback.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })}
        </span>
      </div>

      {feedback.what_works ? <Part label="What works">{feedback.what_works}</Part> : null}
      {feedback.what_needs_work ? (
        <Part label="What needs work">{feedback.what_needs_work}</Part>
      ) : null}
      {feedback.why ? <Part label="Why it matters">{feedback.why}</Part> : null}
      {feedback.next_step ? (
        <div className="border-l-2 border-accent py-1 pl-4">
          <p className="label mb-1 text-accent">Next step</p>
          <p className="text-[0.9375rem] leading-relaxed text-ink">{feedback.next_step}</p>
        </div>
      ) : null}
    </Card>
  );
}

function Part({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

/**
 * The whole review history for one artifact.
 *
 * Newest first, and nothing is hidden. "You submitted this twice before it was
 * approved" is the useful part — a product that showed only the latest verdict
 * would delete the record of somebody getting better.
 */
export function FeedbackHistory({ history }: { history: ArtifactFeedbackRow[] }) {
  if (history.length === 0) return null;

  return (
    <section className="max-w-read space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Label>Review history</Label>
        {history.length > 1 ? (
          <p className="text-sm text-ink-subtle">
            {history.length} reviews. The earlier ones stay.
          </p>
        ) : null}
      </div>
      <ul className="space-y-3">
        {history.map((feedback) => (
          <li key={feedback.id}>
            <FeedbackCard feedback={feedback} />
          </li>
        ))}
      </ul>
    </section>
  );
}
