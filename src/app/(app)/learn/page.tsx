import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Roadmap, RoadmapLegend } from "@/components/lock/roadmap";
import { EmptyState } from "@/components/states/empty-state";
import { Card, Label, Badge } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { buildRoadmap } from "@/lib/lock/roadmap";
import { PHASES } from "@/lib/lock/phases";
import { getCurriculum, getLearningState } from "@/lib/learning/queries";
import { deriveRoadmapProgress, remainingMinutes } from "@/lib/learning/progress";

export const metadata: Metadata = { title: "Roadmap" };

/**
 * The roadmap, now reading real progress.
 *
 * Prompt 2 built this page against `buildRoadmap(null)` and said the learning
 * engine would replace that one argument. This is that change, and it is the
 * whole diff for the roadmap itself — the component, the state vocabulary and
 * the layout are untouched.
 *
 * Continue and Revisit sit above it because they are what somebody returning to
 * LOCK actually needs: where they stopped, and what they flagged. Both are
 * absent rather than empty when there is nothing to show.
 */
export default async function RoadmapPage() {
  const [curriculum, state] = await Promise.all([getCurriculum(), getLearningState()]);

  const progress = deriveRoadmapProgress(curriculum, state.completedLessonIds);
  const phases = buildRoadmap(progress);
  const remaining = remainingMinutes(curriculum, state.completedLessonIds);

  const allLessons = curriculum.flatMap(({ modules }) =>
    modules.flatMap((module) => module.lessons),
  );
  const byId = new Map(allLessons.map((lesson) => [lesson.id, lesson]));

  const continueLesson = state.continueLessonId ? byId.get(state.continueLessonId) : undefined;
  const revisit = [...state.revisitLessonIds]
    .map((id) => byId.get(id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== undefined);
  const recentlyCompleted = state.progress
    .filter((row) => row.status === "completed")
    .slice(0, 3)
    .map((row) => byId.get(row.lesson_id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== undefined);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learn"
        title="The roadmap"
        description="Ten phases, from an idea to a product people pay for. You do them in order, because each one is the input to the next."
        meta={
          <>
            <HeaderMeta label="Phases">{PHASES.length}</HeaderMeta>
            <HeaderMeta label="Complete">{progress.completed.length}</HeaderMeta>
            <HeaderMeta label="Time left">
              {remaining === null ? "Not published yet" : `${remaining} min`}
            </HeaderMeta>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <Label>Continue learning</Label>
          {continueLesson ? (
            <Card className="flex h-full flex-col justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="label text-ink-subtle">{continueLesson.type}</span>
                  <span className="label text-ink-subtle tabular-nums">
                    {continueLesson.estimatedMinutes} min
                  </span>
                </div>
                <p className="text-[1.0625rem] font-medium text-ink">{continueLesson.title}</p>
                <p className="text-sm text-ink-muted">{continueLesson.summary}</p>
              </div>
              <div>
                <ButtonLink href={`/learn/lessons/${continueLesson.slug}`} size="sm">
                  Pick up where you left off
                </ButtonLink>
              </div>
            </Card>
          ) : (
            <EmptyState title="Nothing open" className="h-full">
              <p>
                When you leave a lesson part-way through, it waits here. Start
                anywhere in the list and it will.
              </p>
              <p className="pt-3">
                <ButtonLink href="/learn/lessons" variant="secondary" size="sm">
                  Browse lessons
                </ButtonLink>
              </p>
            </EmptyState>
          )}
        </section>

        <section className="space-y-3">
          <Label>Progress</Label>
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">Phases complete</span>
                <span className="font-mono text-sm tabular-nums text-ink">
                  {progress.completed.length} / {PHASES.length}
                </span>
              </div>
              <ProgressBar
                value={progress.completed.length}
                max={PHASES.length}
                label="Phases complete"
              />
            </div>
            <p className="text-sm text-ink-subtle">
              A phase counts as complete when every lesson published in it is
              done. A phase with nothing published in it never counts.
            </p>
          </Card>
        </section>
      </div>

      {revisit.length > 0 ? (
        <section className="space-y-3">
          <Label>Revisit</Label>
          <ul className="space-y-2">
            {revisit.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/learn/lessons/${lesson.slug}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <span className="text-[0.9375rem] font-medium text-ink">{lesson.title}</span>
                  <Badge tone="accent">You marked this to revisit</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentlyCompleted.length > 0 ? (
        <section className="space-y-3">
          <Label>Recently completed</Label>
          <ul className="space-y-2">
            {recentlyCompleted.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/learn/lessons/${lesson.slug}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <span aria-hidden className="size-2 rounded-full bg-success" />
                  <span className="text-[0.9375rem] font-medium text-ink">{lesson.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RoadmapLegend />

      <section aria-label="Phases">
        <Roadmap phases={phases} />
      </section>
    </div>
  );
}
