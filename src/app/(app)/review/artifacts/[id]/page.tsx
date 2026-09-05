import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { Forbidden } from "@/components/states/forbidden";
import { ReviewForm } from "@/components/mentor/review-form";
import { FeedbackHistory } from "@/components/mentor/feedback";
import { checkAccess, requireSection } from "@/lib/lock/access";
import { getReviewSubject } from "@/lib/mentor/queries";
import { ARTIFACT_STATUS_LABEL, EVIDENCE_KIND_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Review artifact" };

/**
 * The review workspace.
 *
 * The work on the left, the verdict on the right, stacking on a phone. That
 * order is not decoration: a review written without the work in view is the
 * "looks good" this whole layer exists to prevent, and putting the panel beside
 * the artifact rather than after it keeps both readable at once.
 *
 * Evidence is listed as links that open in a new tab with `noopener` — the
 * mentor is being asked to open URLs a learner supplied, so the tab that opens
 * must not be able to reach back into LOCK.
 */
export default async function ReviewArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const section = requireSection("/review");
  const { profile, allowed } = await checkAccess(section.access);
  if (!allowed) return <Forbidden role={profile.role} />;

  const { id } = await params;
  const subject = await getReviewSubject(id);

  /*
   * Null means the row exists but Row Level Security did not return it — a
   * learner not assigned to this mentor. A 404 is the honest answer: "it exists
   * but is not yours" is itself information.
   */
  if (!subject) notFound();

  const own = subject.artifact.profile_id === profile.id;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Review"
        title={subject.artifact.title}
        description={subject.mission?.objective ?? ""}
        meta={
          <>
            <HeaderMeta label="Learner">
              {subject.learner?.display_name ?? "Learner"}
            </HeaderMeta>
            <HeaderMeta label="Project">{subject.project?.name ?? "—"}</HeaderMeta>
            <HeaderMeta label="Status">
              {ARTIFACT_STATUS_LABEL[subject.artifact.status]}
            </HeaderMeta>
            <HeaderMeta label="Reviews">{subject.history.length}</HeaderMeta>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* The work. */}
        <div className="min-w-0 space-y-6">
          <section className="space-y-3">
            <Label as="h2">The deliverable</Label>
            <Card className="p-5">
              {subject.artifact.content ? (
                <pre className="overflow-x-auto font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink">
                  {subject.artifact.content}
                </pre>
              ) : (
                <p className="text-sm text-ink-subtle">
                  Nothing written — the work is at the link below.
                </p>
              )}

              {subject.artifact.url ? (
                <p className="mt-4 border-t border-border pt-4">
                  <a
                    href={subject.artifact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm break-all text-ink underline decoration-border-strong underline-offset-4"
                  >
                    {subject.artifact.url}
                  </a>
                </p>
              ) : null}
            </Card>
          </section>

          <section className="space-y-3">
            <Label as="h2">Evidence</Label>
            {subject.evidence.length === 0 ? (
              <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
                None attached. If the mission required proof, submission would
                have been refused — so this mission did not ask for any.
              </p>
            ) : (
              <ul className="space-y-2">
                {subject.evidence.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-card border border-border p-4"
                  >
                    <span className="label mr-3 text-ink-subtle">
                      {EVIDENCE_KIND_LABEL[row.kind]}
                    </span>
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm break-all text-ink underline decoration-border-strong underline-offset-4"
                      >
                        {row.label || row.url}
                      </a>
                    ) : (
                      <span className="text-sm text-ink-muted">{row.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {subject.mission ? (
            <section className="space-y-3">
              <Label as="h2">What was asked for</Label>
              <Card className="space-y-2 p-5">
                <p className="text-[0.9375rem] font-medium text-ink">
                  {subject.mission.deliverable_title}
                </p>
                <p className="text-sm text-ink-muted">
                  {subject.mission.deliverable_description}
                </p>
                {subject.mission.requires_review ? (
                  <p className="pt-2">
                    <Badge tone="accent">This mission needs your approval to complete</Badge>
                  </p>
                ) : null}
                <p className="pt-2">
                  <Link
                    href={`/learn/missions/${subject.mission.slug}`}
                    className="text-sm text-ink underline decoration-border-strong underline-offset-4"
                  >
                    Open the mission
                  </Link>
                </p>
              </Card>
            </section>
          ) : null}
        </div>

        {/* The verdict. */}
        <div className="min-w-0 space-y-6">
          {own ? (
            <Card className="p-5">
              <p className="text-sm text-ink-muted">
                This is your own work. Nobody reviews themselves, whatever role
                they hold — the database refuses it too.
              </p>
            </Card>
          ) : (
            <ReviewForm artifactId={subject.artifact.id} />
          )}

          <FeedbackHistory history={subject.history} />
        </div>
      </div>
    </div>
  );
}
