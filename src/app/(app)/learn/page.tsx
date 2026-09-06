import type { Metadata } from "next";
import Link from "next/link";
import {
  ContinueCard,
  CourseProgress,
  ModuleCard,
  PhaseSection,
} from "@/components/learning/course";
import { getLearningOverview } from "@/lib/learning/overview";

export const metadata: Metadata = { title: "Learn" };

/**
 * The classroom. One programme, one page, one thing to do next.
 *
 * What was here before: a roadmap that was one of three learning destinations,
 * beside a lesson library and a mission library. Each had its own idea of where
 * the learner was, and none of them was the place to start — a learner had to
 * understand the difference between a roadmap, a lesson and a mission before
 * they could open anything.
 *
 * What is here now, in the order it is read:
 *
 *   1. what LOCK is, in one sentence and one progress bar
 *   2. the single thing to do now — start, or carry on exactly where you were
 *   3. the whole journey, as the sections of one course
 *
 * The ten phases are sections of one programme rather than ten destinations.
 * Only the phase the learner is in opens; the rest state their shape and stay
 * shut. Seeing all ten matters — the destination is the point — but reading all
 * ten at once is the wall of cards this replaced.
 */
export default async function LearnPage() {
  const overview = await getLearningOverview();
  const {
    phases,
    activeKey,
    nextLesson,
    nextMission,
    nextModule,
    started,
    completedLessons,
    totalLessons,
    moduleCount,
    totalMissions,
  } = overview;

  const published = phases.filter((phase) => phase.published);
  /*
   * The first phase with nothing in it is the one being written; the ones
   * behind it are "later". Not "coming next" — that reads as "this is your next
   * step", which is a different phase entirely and a genuinely misleading thing
   * to say. Nine identical notices reads as nine failures; a column of states
   * reads as a plan.
   */
  const beingWrittenKey = phases.find((phase) => !phase.published)?.key ?? null;

  return (
    <div className="space-y-12">
      {/* ── What this is ─────────────────────────────────────────────────── */}
      <header className="space-y-6">
        <div className="space-y-3">
          <p className="label text-ink-subtle">The programme</p>
          <h1 className="text-display max-w-measure text-balance">
            Build a real SaaS with AI
          </h1>
          <p className="max-w-measure text-lede text-ink-muted">
            Ten phases, from an idea nobody has validated to a product people pay
            for. You learn a thing, then you do it — and what you produce becomes
            the SaaS you are building.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <CourseProgress
            done={completedLessons}
            total={totalLessons}
            label="Progress through the programme"
            className="w-full sm:max-w-xs"
          />
          <p className="label flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-subtle">
            <span className="tabular-nums">10 phases</span>
            <span className="tabular-nums">
              {moduleCount} {moduleCount === 1 ? "module" : "modules"}
            </span>
            <span className="tabular-nums">
              {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
            </span>
            <span className="tabular-nums">
              {totalMissions} {totalMissions === 1 ? "mission" : "missions"}
            </span>
          </p>
        </div>
      </header>

      {/* ── The one thing to do now ──────────────────────────────────────── */}
      {!started ? (
        <ContinueCard
          eyebrow="Start here"
          title="Learn how LOCK works, then build"
          description="Five minutes on how the programme runs, what you will produce, and where to begin. Then you start the first module."
          href="/learn/start"
          action="Start here"
          aside={
            nextLesson ? (
              <Link
                href={`/learn/lessons/${nextLesson.lesson.slug}`}
                className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
              >
                Skip to the first lesson
              </Link>
            ) : null
          }
        />
      ) : nextLesson && nextModule ? (
        <ContinueCard
          eyebrow="Continue learning"
          /* Phase and module by name. The module *number* is in neither — it
             is the one part of the address a learner never needs, and on a
             phone it was what pushed the line onto a second row mid-title. */
          context={`${String(nextLesson.phase.number).padStart(2, "0")} ${nextLesson.phase.label} · ${nextModule.module.title}`}
          title={nextLesson.lesson.title}
          description={nextLesson.lesson.summary}
          href={`/learn/lessons/${nextLesson.lesson.slug}`}
          action="Continue"
          progress={{ done: nextModule.lessonsDone, total: nextModule.lessons.length }}
          aside={<StartHereLink />}
        />
      ) : nextMission ? (
        <ContinueCard
          eyebrow="Next up"
          context="Every lesson so far is done"
          title={nextMission.mission.title}
          description={nextMission.mission.objective}
          href={`/learn/missions/${nextMission.mission.slug}`}
          action="Open the mission"
          aside={<StartHereLink />}
        />
      ) : (
        <ContinueCard
          eyebrow="You are up to date"
          title="Everything published so far is done"
          description="The next phase opens as it is written. Your work so far is in My SaaS."
          href="/build"
          action="Open My SaaS"
          aside={<StartHereLink />}
        />
      )}

      {/* ── The whole journey ────────────────────────────────────────────── */}
      <section>
        <h2 className="label pb-4 text-ink-subtle">Your journey</h2>

        <div>
          {phases.map((phase) => {
            const active = phase.key === activeKey && phase.published;
            const counts = phase.published
              ? [
                  `${phase.modules.length} ${phase.modules.length === 1 ? "module" : "modules"}`,
                  `${phase.lessonCount} ${phase.lessonCount === 1 ? "lesson" : "lessons"}`,
                  phase.missions.length > 0
                    ? `${phase.missions.length} ${phase.missions.length === 1 ? "mission" : "missions"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : null;

            return (
              <PhaseSection
                key={phase.key}
                number={phase.number}
                label={phase.label}
                summary={phase.summary}
                active={active}
                counts={counts}
                status={phaseStatus({
                  published: phase.published,
                  active,
                  done: phase.lessonsDone,
                  total: phase.lessonCount,
                  beingWritten: phase.key === beingWrittenKey,
                })}
              >
                {active && phase.modules.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {phase.modules.map((entry) => (
                      <ModuleCard
                        key={entry.module.id}
                        number={entry.number}
                        title={entry.module.title}
                        summary={entry.module.summary}
                        href={`/learn/modules/${entry.module.slug}`}
                        lessons={entry.lessons.length}
                        lessonsDone={entry.lessonsDone}
                        missions={entry.missions.length}
                        minutes={entry.minutes}
                        next={entry.module.id === nextModule?.module.id}
                      />
                    ))}
                  </div>
                ) : null}
              </PhaseSection>
            );
          })}
        </div>
      </section>

      {/*
       * The two libraries that used to be sidebar destinations. They still
       * exist and still work; they are here, at the bottom, because a learner
       * following the programme never needs them — and somebody looking for one
       * specific thing should not have to remember a URL.
       */}
      <footer className="border-t border-border pt-6">
        <p className="label text-ink-subtle">Looking for something specific?</p>
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href="/learn/lessons"
            className="text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
          >
            Every lesson
          </Link>
          <Link
            href="/learn/missions"
            className="text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
          >
            Every mission
          </Link>
          <Link
            href="/learn/start"
            className="text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
          >
            How LOCK works
          </Link>
        </p>
        {published.length < phases.length ? (
          <p className="mt-4 max-w-measure text-sm text-ink-subtle">
            {published.length} of {phases.length} phases are written. The rest are
            listed above so the destination is visible while the programme is
            being published.
          </p>
        ) : null}
      </footer>
    </div>
  );
}

function StartHereLink() {
  return (
    <Link
      href="/learn/start"
      className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
    >
      How LOCK works
    </Link>
  );
}

/** The right-hand word on a phase. One line, always true. */
function phaseStatus({
  published,
  active,
  done,
  total,
  beingWritten,
}: {
  published: boolean;
  active: boolean;
  done: number;
  total: number;
  beingWritten: boolean;
}): string {
  if (!published) return beingWritten ? "Being written" : "Later";
  if (total > 0 && done === total) return "Complete";
  if (done > 0) return `${Math.round((done / total) * 100)}% complete`;
  return active ? "You are here" : "Not started";
}
