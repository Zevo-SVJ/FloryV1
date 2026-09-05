import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { Forbidden } from "@/components/states/forbidden";
import { NoteForm, AnswerForm } from "@/components/mentor/review-form";
import { checkAccess, requireSection } from "@/lib/lock/access";
import { getLearnerDetail } from "@/lib/mentor/queries";
import { ARTIFACT_STATUS_LABEL } from "@/lib/workspace/labels";
import { QUESTION_STATUS_LABEL } from "@/lib/mentor/labels";
import { PROJECT_STATUS_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Learner" };

/**
 * One learner, as their mentor sees them.
 *
 * Everything on this page is read-only except the two things a mentor owns: a
 * private note, and an answer. A mentor who could edit an artifact would be
 * doing the mission, and the database refuses that too.
 */
export default async function LearnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const section = requireSection("/review");
  const { profile, allowed } = await checkAccess(section.access);
  if (!allowed) return <Forbidden role={profile.role} />;

  const { id } = await params;
  const detail = await getLearnerDetail(id);

  // Not assigned to this mentor, or not a learner at all.
  if (!detail) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learner"
        title={detail.learner.display_name ?? "Learner"}
        description={detail.project?.description ?? "No project described yet."}
        meta={
          <>
            <HeaderMeta label="Project">{detail.project?.name ?? "None yet"}</HeaderMeta>
            <HeaderMeta label="Lessons">{detail.lessonsCompleted}</HeaderMeta>
            <HeaderMeta label="Missions">{detail.missionsCompleted}</HeaderMeta>
            <HeaderMeta label="To review">{detail.pendingReviews}</HeaderMeta>
          </>
        }
      />

      {detail.project ? (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Label>Their SaaS</Label>
            <Badge>{PROJECT_STATUS_LABEL[detail.project.status]}</Badge>
          </div>
          <p className="text-[1.0625rem] font-medium text-ink">{detail.project.name}</p>
          <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="label text-ink-subtle">The problem</dt>
              <dd className="text-ink-muted">
                {detail.project.problem_statement || "Not defined yet"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="label text-ink-subtle">Who has it</dt>
              <dd className="text-ink-muted">
                {detail.project.target_audience || "Not defined yet"}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <section className="space-y-3">
        <Label>Artifacts</Label>
        {detail.artifacts.length === 0 ? (
          <EmptyState title="Nothing produced yet">
            <p>Their missions have not produced anything for you to read.</p>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {detail.artifacts.map((artifact) => (
              <li key={artifact.id}>
                <Link
                  href={`/review/artifacts/${artifact.id}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <span className="text-[0.9375rem] font-medium text-ink">{artifact.title}</span>
                  <Badge tone={artifact.status === "draft" ? "quiet" : "accent"}>
                    {ARTIFACT_STATUS_LABEL[artifact.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <Label>Questions</Label>
        {detail.questions.length === 0 ? (
          <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
            They have not asked anything.
          </p>
        ) : (
          <ul className="space-y-3">
            {detail.questions.map((question) => (
              <li key={question.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Badge tone={question.status === "open" ? "accent" : "quiet"}>
                      {QUESTION_STATUS_LABEL[question.status]}
                    </Badge>
                    <span className="label text-ink-subtle tabular-nums">
                      {new Date(question.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <p className="text-[0.9375rem] text-ink">{question.question}</p>

                  {question.response ? (
                    <div className="border-l-2 border-accent py-1 pl-4">
                      <p className="label mb-1 text-accent">Your answer</p>
                      <p className="text-[0.9375rem] text-ink-muted">{question.response}</p>
                    </div>
                  ) : (
                    <AnswerForm questionId={question.id} learnerId={detail.learner.id} />
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="max-w-measure space-y-3">
        <Card className="p-5">
          <NoteForm learnerId={detail.learner.id} />
        </Card>

        {detail.notes.length > 0 ? (
          <ul className="space-y-2">
            {detail.notes.map((note) => (
              <li key={note.id} className="rounded-card border border-border p-4">
                <p className="label mb-2 text-ink-subtle tabular-nums">
                  {new Date(note.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                <p className="text-sm text-ink-muted">{note.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {detail.buildLog.length > 0 ? (
        <section className="space-y-3">
          <Label>Recent activity</Label>
          <ul className="space-y-2">
            {detail.buildLog.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="label text-ink-subtle tabular-nums">
                  {new Date(entry.occurred_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </span>
                <span className="text-sm text-ink">{entry.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
