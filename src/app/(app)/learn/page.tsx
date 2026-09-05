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
import { remainingMinutes } from "@/lib/learning/progress";
import { getProgressSnapshot } from "@/lib/progress/queries";
import { getWorkspaceSnapshot } from "@/lib/workspace/queries";
import { roadmapFromPhases, focusPhase } from "@/lib/progress/rules";

export const metadata: Metadata = { title: "Roadmap" };

/**
 * The roadmap: a journey, with the five questions answered at the top.
 *
 * Where am I, what have I completed, what am I working on, what comes next,
 * why does it matter. Those five sit above the route because a person opening
 * this page is orienting, not browsing — and the ten-phase list underneath
 * answers "how far" rather than "where".
 *
 * Progress now comes from `learner_phase_progress` rather than from counting
 * lessons in TypeScript. That is the substantive change: the old derivation
 * knew about lessons only, so a phase of finished missions read as untouched.
 * One rule, in SQL, weighted, and the same rule the progress page and the
 * dashboard use.
 */
export default async function RoadmapPage() {
  const [curriculum, state, snapshot, workspace] = await Promise.all([
    getCurriculum(),
    getLearningState(),
    getProgressSnapshot(),
    getWorkspaceSnapshot(),
  ]);

  const progress = roadmapFromPhases(snapshot.phases);
  const phases = buildRoadmap(progress);
  const detail = new Map(snapshot.phases.map((row) => [row.phase_key, row]));
  const focus = focusPhase(snapshot.phases);
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
            <HeaderMeta label="Overall">
              {snapshot.overall?.percent === null || snapshot.overall === null
                ? "—"
                : `${snapshot.overall.percent}%`}
            </HeaderMeta>
            <HeaderMeta label="Time left">
              {remaining === null ? "Not published yet" : `${remaining} min`}
            </HeaderMeta>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <Label as="h2">Continue learning</Label>
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
          <Label as="h2">Where you are</Label>
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">
                  {focus ? focus.label : "Phases complete"}
                </span>
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

            {/* Why it matters, in the phase's own words. The summary is
                written for exactly this: what you walk out of the phase
                holding. */}
            <p className="text-sm text-ink-subtle">
              {focus
                ? focus.summary
                : "A phase counts as complete when everything published in it is done. A phase with nothing published never counts."}
            </p>
          </Card>
        </section>
      </div>

      {/* What you are working on, and what comes after it. Missions rather
          than lessons, because a mission is the unit of work. */}
      {workspace.current || workspace.next ? (
        <section className="space-y-3">
          <Label as="h2">The work in front of you</Label>
          <div className="grid gap-4 md:grid-cols-2">
            {workspace.current ? (
              <Card className="space-y-2 p-5">
                <p className="label text-accent">Now</p>
                <p className="text-[0.9375rem] font-medium text-ink">
                  {workspace.current.mission.title}
                </p>
                <p className="text-sm text-ink-muted">{workspace.current.mission.objective}</p>
                <p className="pt-2">
                  <ButtonLink
                    href={`/learn/missions/${workspace.current.mission.slug}`}
                    size="sm"
                  >
                    Open the mission
                  </ButtonLink>
                </p>
              </Card>
            ) : null}

            {workspace.next ? (
              <Card className="space-y-2 p-5">
                <p className="label text-ink-subtle">Next</p>
                <p className="text-[0.9375rem] font-medium text-ink">
                  {workspace.next.mission.title}
                </p>
                <p className="text-sm text-ink-muted">{workspace.next.mission.objective}</p>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      {revisit.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">Revisit</Label>
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
          <Label as="h2">Recently completed</Label>
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
        <Roadmap phases={phases} detail={detail} />
      </section>
    </div>
  );
}
