import type { Metadata } from "next";
import { Screen, ToolbarButton } from "@/components/ui/screen";
import { Group, LinkRow } from "@/components/ui/list";
import { Meter, ModuleRow, NextAction, PhaseRow } from "@/components/learning/course";
import { Icon } from "@/components/ui/icon";
import { getLearningOverview } from "@/lib/learning/overview";

export const metadata: Metadata = { title: "Learn" };

/**
 * The classroom. One programme, one screen, one thing to do next.
 *
 * Read top to bottom it answers, in order: what is this, how far am I, what do
 * I do now, what is in front of me, and where does the whole thing go.
 *
 * Two structural decisions carry it.
 *
 * The active phase's modules are lifted out of the journey list and given their
 * own group directly under the next action. The alternative — expanding one row
 * of a ten-row list into a grid of cards — puts the most important thing on the
 * screen inside the least important structure on it, and duplicates the phase's
 * name and progress in two places a few pixels apart.
 *
 * The ten phases are then a list, not a grid. Ten rows read as a table of
 * contents; ten cards read as ten products. Seeing all ten matters, because the
 * destination is the point — reading all ten at once was the wall of cards this
 * replaced.
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
  } = overview;

  const active = phases.find((phase) => phase.key === activeKey) ?? null;
  /* The first phase with nothing in it is the one being written; the rest are
     "later". Not "coming next" — that reads as "this is your next step", which
     points at a different phase entirely. */
  const beingWrittenKey = phases.find((phase) => !phase.published)?.key ?? null;

  return (
    <Screen
      title="Build a real SaaS"
      eyebrow="The programme"
      width="content"
      actions={
        <ToolbarButton icon="sparkle" label="How LOCK works" href="/learn/start" />
      }
      lede={
        <>
          Ten phases, from an idea nobody has validated to a product people pay
          for. You learn a thing, then you do it — and what you produce becomes
          the SaaS you are building.
        </>
      }
    >
      <div className="space-y-10 sm:space-y-12">
        <Meter
          done={completedLessons}
          total={totalLessons}
          label="Progress through the programme"
          className="max-w-72"
        />

        {/* ── The one thing to do now ────────────────────────────────────── */}
        {!started ? (
          <NextAction
            eyebrow="Start here"
            title="You are here to build a real SaaS"
            description="Five minutes on how the programme runs, what you will produce, and where you begin. Then you are in the first module."
            href="/learn/start"
            action="Start building"
          />
        ) : nextLesson && nextModule ? (
          <NextAction
            eyebrow="Continue learning"
            context={`${String(nextLesson.phase.number).padStart(2, "0")} ${nextLesson.phase.label} · ${nextModule.module.title}`}
            title={nextLesson.lesson.title}
            description={nextLesson.lesson.summary}
            href={`/learn/lessons/${nextLesson.lesson.slug}`}
            action="Continue"
            progress={{
              done: nextModule.lessonsDone,
              total: nextModule.lessons.length,
              label: `Progress in ${nextModule.module.title}`,
            }}
          />
        ) : nextMission ? (
          <NextAction
            eyebrow="Next up"
            context="Every lesson so far is done"
            title={nextMission.mission.title}
            description={nextMission.mission.objective}
            href={`/learn/missions/${nextMission.mission.slug}`}
            action="Open the mission"
          />
        ) : (
          <NextAction
            eyebrow="You are up to date"
            title="Everything published so far is done"
            description="The next phase opens as it is written. Your work so far is in My SaaS."
            href="/build"
            action="Open My SaaS"
          />
        )}

        {/* ── What is in front of you ────────────────────────────────────── */}
        {active && active.published && active.modules.length > 0 ? (
          <Group
            title={`In ${active.label}`}
            action={
              <span className="font-mono text-footnote tabular-nums text-ink-subtle">
                {active.lessonsDone}/{active.lessonCount} lessons
              </span>
            }
            className="rise rise-1"
          >
            {active.modules.map((entry) => (
              <ModuleRow
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
          </Group>
        ) : null}

        {/* ── The whole journey ──────────────────────────────────────────── */}
        <Group
          title="The ten phases"
          className="rise rise-2"
          footnote={
            phases.some((phase) => !phase.published)
              ? "Phases open as they are written. They are listed so the destination stays visible while the programme is being published."
              : undefined
          }
        >
          {phases.map((phase) => (
            <PhaseRow
              key={phase.key}
              number={phase.number}
              label={phase.label}
              summary={phase.summary}
              done={phase.lessonsDone}
              total={phase.lessonCount}
              href={phase.published ? `/learn/modules/${phase.modules[0]?.module.slug ?? ""}` : undefined}
              state={
                !phase.published
                  ? phase.key === beingWrittenKey
                    ? "soon"
                    : "later"
                  : phase.lessonCount > 0 && phase.lessonsDone === phase.lessonCount
                    ? "done"
                    : phase.key === activeKey
                      ? "here"
                      : "open"
              }
            />
          ))}
        </Group>

        {/*
         * The two libraries that used to be sidebar destinations. They still
         * exist and still work; they are here, at the foot, because a learner
         * following the programme never needs them — and somebody hunting for
         * one specific thing should not have to remember a URL.
         */}
        <Group title="Also" className="rise rise-3">
          <LinkRow
            href="/learn/lessons"
            leading={<Icon name="list" className="size-[1.15rem] text-ink-subtle" />}
            title="Every lesson"
            detail="The complete index, for finding one specific thing."
          />
          <LinkRow
            href="/learn/missions"
            leading={<Icon name="target" className="size-[1.15rem] text-ink-subtle" />}
            title="Every mission"
            detail="The complete index, for finding one specific thing."
          />
        </Group>
      </div>
    </Screen>
  );
}
