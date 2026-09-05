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
import { getProgressSnapshot, getSkillStates, getAwards, getActivity } from "@/lib/progress/queries";
import { focusPhase, movingSkills } from "@/lib/progress/rules";
import { CurrentPhase } from "@/components/progress/phase-progress";
import { SkillLine } from "@/components/progress/skill";
import { AwardLine } from "@/components/progress/award";
import { ActivityFeed } from "@/components/progress/activity";
import { AwardMilestoneForm } from "@/components/progress/award-form";
import { ProgressBar } from "@/components/ui/progress-bar";
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
 *
 * Prompt 7 added the progress half — phase, skills, milestones, activity. The
 * learner id is passed to those queries as a *filter*, not as a permission:
 * every one of them reads a `security_invoker` view whose policies say
 * `can_review(profile_id)`, so a mentor with no assignment to this learner gets
 * empty results whatever id reaches the query. The `notFound()` above is the
 * interface being tidy; the database is what makes it safe.
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

  const [snapshot, skills, awards, activity] = await Promise.all([
    getProgressSnapshot(id),
    getSkillStates(id),
    getAwards(id),
    getActivity(8, id),
  ]);

  const focus = focusPhase(snapshot.phases);
  const moving = movingSkills(skills, 6);
  const earned = awards.definitions
    .flatMap((award) => {
      const row = awards.earned.get(award.key);
      return row ? [{ award, earned: row }] : [];
    })
    .sort((a, b) => b.earned.earned_at.localeCompare(a.earned.earned_at));

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
            <HeaderMeta label="Overall">
              {snapshot.overall?.percent == null ? "—" : `${snapshot.overall.percent}%`}
            </HeaderMeta>
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

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <Label as="h2">Where they are</Label>
          {focus ? (
            <CurrentPhase phase={focus} />
          ) : (
            <EmptyState title="Nothing published yet" className="h-full">
              <p>
                No phase has content this learner can reach, so there is no
                position to report.
              </p>
            </EmptyState>
          )}
        </section>

        <section className="space-y-3">
          <Label as="h2">Overall</Label>
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">Through the roadmap</span>
                <span className="font-mono text-sm tabular-nums text-ink">
                  {snapshot.overall?.percent == null
                    ? "—"
                    : `${snapshot.overall.percent}%`}
                </span>
              </div>
              <ProgressBar
                value={snapshot.overall?.percent ?? null}
                max={100}
                label="Overall progress"
              />
            </div>
            <p className="text-sm text-ink-subtle">
              {snapshot.xp?.total ?? 0} XP · {awards.earned.size} of{" "}
              {awards.definitions.length} milestones ·{" "}
              {snapshot.streak?.active_days ?? 0} active days
            </p>
          </Card>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <Label as="h2">Skills</Label>
          {moving.length === 0 ? (
            <EmptyState title="No skills in motion yet" className="h-full">
              <p>
                A skill moves on evidence. Nothing this learner has done has
                produced any yet — which is the correct thing for this to say.
              </p>
            </EmptyState>
          ) : (
            <Card className="h-full px-5 py-2">
              <ul className="divide-y divide-border">
                {moving.map((skill) => (
                  <SkillLine key={skill.skill_key} skill={skill} />
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <Label as="h2">Milestones</Label>
          {earned.length === 0 ? (
            <EmptyState title="No milestones yet" className="h-full">
              <p>
                First Idea is earned the moment they name what they are
                building.
              </p>
            </EmptyState>
          ) : (
            <Card className="h-full px-5 py-2">
              <ul className="divide-y divide-border">
                {earned.slice(0, 6).map(({ award, earned: row }) => (
                  <AwardLine key={award.key} award={award} earnedAt={row.earned_at} />
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      {/* Only the milestones a person has to confirm, and only the ones this
          learner does not already hold. Plain strings, because anything passed
          to a Client Component is serialized into the page. */}
      <AwardMilestoneForm
        learnerId={id}
        options={awards.definitions
          .filter(
            (award) => award.requirement === "manual" && !awards.earned.has(award.key),
          )
          .map((award) => ({ key: award.key, title: award.title }))}
      />

      <ActivityFeed
        entries={activity}
        heading="Their recent activity"
        emptyTitle="Nothing yet"
        emptyBody="Lessons finished, work submitted and milestones reached appear here as they happen."
      />

      <section className="space-y-3">
        <Label as="h2">Artifacts</Label>
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
        <Label as="h2">Questions</Label>
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
          <Label as="h2">Recent activity</Label>
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
