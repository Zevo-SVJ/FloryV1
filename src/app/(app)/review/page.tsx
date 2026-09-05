import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { Forbidden } from "@/components/states/forbidden";
import { checkAccess, requireSection } from "@/lib/lock/access";
import { getAssignedLearners, getNotifications, getReviewQueue } from "@/lib/mentor/queries";
import { ARTIFACT_STATUS_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Review" };

/**
 * The mentor's dashboard.
 *
 * The queue leads and is ordered oldest first: the longest wait is the one that
 * matters, and a queue sorted newest-first quietly abandons whatever fell off
 * the top. Everything else on this page is context for deciding what to open.
 *
 * The role gate is here, in the page, as it is everywhere else — and the
 * database refuses the reads anyway, so an unauthorised visitor who somehow
 * reached this route would see an empty page rather than somebody's work.
 */
export default async function ReviewPage() {
  const section = requireSection("/review");
  const { profile, allowed } = await checkAccess(section.access);
  if (!allowed) return <Forbidden role={profile.role} />;

  const [queue, learners, notifications] = await Promise.all([
    getReviewQueue(),
    getAssignedLearners(),
    getNotifications(6),
  ]);

  const attention = learners.filter(
    (entry) => entry.pendingReviews > 0 || entry.openQuestions > 0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Staff"
        title="Review"
        description="Work waiting on a verdict. Your job is to improve their judgement and stop them building the wrong thing — not to do it for them."
        meta={
          <>
            <HeaderMeta label="Waiting">{queue.length}</HeaderMeta>
            <HeaderMeta label="Learners">{learners.length}</HeaderMeta>
            <HeaderMeta label="Need attention">{attention.length}</HeaderMeta>
          </>
        }
      />

      <section className="space-y-3">
        <Label>Pending reviews</Label>
        {queue.length === 0 ? (
          <EmptyState title="Nothing waiting">
            <p>
              Submitted deliverables land here, oldest first. Until then there is
              nothing for you to do, which is the correct state most of the time.
            </p>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {queue.map((entry) => (
              <li key={entry.artifact.id}>
                <Link
                  href={`/review/artifacts/${entry.artifact.id}`}
                  className="block rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span className="text-[0.9375rem] font-medium text-ink">
                      {entry.artifact.title}
                    </span>
                    <Badge>{ARTIFACT_STATUS_LABEL[entry.artifact.status]}</Badge>
                    <span className="label text-ink-subtle">
                      {entry.learner?.display_name ?? "Learner"}
                    </span>
                    {entry.evidenceCount > 0 ? (
                      <span className="label text-ink-subtle tabular-nums">
                        {entry.evidenceCount} evidence
                      </span>
                    ) : (
                      <span className="label text-ink-subtle">No evidence attached</span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-ink-muted">
                    {entry.mission ? entry.mission.title : "No mission"}
                    {entry.project ? ` · ${entry.project.name}` : ""}
                  </p>

                  {entry.artifact.submitted_at ? (
                    <p className="label mt-2 text-ink-subtle tabular-nums">
                      Submitted{" "}
                      {new Date(entry.artifact.submitted_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <Label>Learners</Label>
        {learners.length === 0 ? (
          <EmptyState title="No learners assigned">
            <p>
              A mentor sees the work of learners paired with them. Pairing is a
              row in <code className="font-mono text-ink">learner_mentor_relationships</code>,
              added by an administrator.
            </p>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {learners.map((entry) => (
              <li key={entry.learner.id}>
                <Link
                  href={`/review/learners/${entry.learner.id}`}
                  className="block rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span className="text-[0.9375rem] font-medium text-ink">
                      {entry.learner.display_name ?? "Learner"}
                    </span>
                    {entry.project ? (
                      <span className="label text-ink-subtle">{entry.project.name}</span>
                    ) : (
                      <span className="label text-ink-subtle">No project yet</span>
                    )}
                    {entry.pendingReviews > 0 ? (
                      <Badge tone="accent">{entry.pendingReviews} to review</Badge>
                    ) : null}
                    {entry.openQuestions > 0 ? (
                      <Badge tone="accent">{entry.openQuestions} question</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {entry.lessonsCompleted} lessons · {entry.missionsCompleted} missions
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {notifications.length > 0 ? (
        <section className="space-y-3">
          <Label>Recent activity</Label>
          <ul className="space-y-2">
            {notifications.map((row) => (
              <li key={row.id}>
                <Card className="p-4">
                  <p className="text-sm text-ink">{row.title}</p>
                  {row.body ? <p className="mt-1 text-sm text-ink-muted">{row.body}</p> : null}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
