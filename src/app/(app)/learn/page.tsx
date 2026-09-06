import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { JourneyStrip } from "@/components/learning/journey";
import { PhaseBand, PhaseInPreparation, ModuleBlock } from "@/components/learning/hierarchy";
import { getLearningOverview } from "@/lib/learning/overview";

export const metadata: Metadata = { title: "Roadmap" };

/**
 * The journey, as the page rather than as a list on it.
 *
 * What was here before: a stats row, two cards in a two-column grid that left
 * the right half of the screen empty, a legend card explaining four dots, and
 * ten identical rows nine of which said "NOT PUBLISHED YET". The structure of
 * the programme was present and unreadable.
 *
 * What replaced it: the strip at the top answers "where am I" in one shape, the
 * current phase opens to show its modules, and every other phase stays one
 * quiet line. A phase nobody has written yet says what it is *for* — the shape
 * of the ten stays visible, which is the reason to show all ten at all.
 *
 * The legend is gone. Four states are named in words on the rows themselves, so
 * a card teaching the reader to decode dots was explaining a problem rather
 * than solving it.
 */
export default async function RoadmapPage() {
  const overview = await getLearningOverview();
  const { phases, current, activeKey, nextLesson, nextMission, revisit } = overview;
  const active = phases.find((p) => p.key === activeKey) ?? current;

  /*
   * The one module to open now: the one holding the "Next" lesson. Marking
   * every unfinished module made the accent meaningless and made two untouched
   * modules both claim to be in progress.
   */
  const nextModuleId =
    active?.modules.find((entry) =>
      nextLesson
        ? entry.lessons.some((lesson) => lesson.id === nextLesson.lesson.id)
        : entry.nextLesson !== null,
    )?.module.id ?? null;

  return (
    <div className="space-y-12">
      {/* ── Where you are ────────────────────────────────────────────────── */}
      <header className="space-y-6">
        <div className="space-y-2">
          <p className="label text-ink-subtle">Learn</p>
          <h1 className="text-display max-w-measure text-balance">Your build journey</h1>
          <p className="max-w-measure text-lede text-ink-muted">
            {active
              ? `Ten phases, from an idea to a product people pay for. You are on ${String(active.number).padStart(2, "0")} — ${active.label.toLowerCase()}.`
              : "Ten phases, from an idea to a product people pay for. Each one is the input to the next."}
          </p>
        </div>

        <JourneyStrip
          phases={phases.map((p) => ({
            key: p.key, number: p.number, label: p.label, state: p.state, percent: p.percent,
          }))}
          activeKey={activeKey}
          href={null}
        />
      </header>

      {/* ── The one thing to do now ──────────────────────────────────────── */}
      {nextLesson || nextMission ? (
        <section className="border-y border-border py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="label text-accent">Next</p>
              <p className="text-title text-balance">
                {nextLesson ? nextLesson.lesson.title : nextMission!.mission.title}
              </p>
              <p className="max-w-measure text-sm leading-relaxed text-ink-muted">
                {nextLesson ? nextLesson.lesson.summary : nextMission!.mission.objective}
              </p>
            </div>
            <div className="shrink-0">
              <ButtonLink
                href={
                  nextLesson
                    ? `/learn/lessons/${nextLesson.lesson.slug}`
                    : `/learn/missions/${nextMission!.mission.slug}`
                }
              >
                {nextLesson ? "Start the lesson" : "Open the mission"}
              </ButtonLink>
            </div>
          </div>

          {revisit.length > 0 ? (
            <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="label text-ink-subtle">Flagged to revisit</span>
              {revisit.slice(0, 3).map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.slug}`}
                  className="text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
                >
                  {lesson.title}
                </Link>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── The ten phases ───────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="label text-ink-subtle">The ten phases</h2>

        {/*
         * A single rule down the left, behind the marks, stopping before the
         * last one so the route reads as finite rather than trailing off.
         */}
        <ol className="relative space-y-9 pt-4">
          <span aria-hidden className="absolute top-6 bottom-6 left-3 w-px bg-border" />

          {phases.map((phase) => (
            <li key={phase.key}>
              <PhaseBand
                number={phase.number}
                label={phase.label}
                summary={phase.summary}
                state={phase.state}
                meta={
                  phase.published ? (
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="label tabular-nums text-ink-subtle">
                        {phase.lessonsDone}/{phase.lessonCount} lessons
                      </span>
                      {phase.missions.length > 0 ? (
                        <span className="label tabular-nums text-ink-subtle">
                          {phase.missionsDone}/{phase.missions.length} missions
                        </span>
                      ) : null}
                      {phase.percent !== null ? (
                        <span className="label tabular-nums text-ink-muted">{phase.percent}%</span>
                      ) : null}
                    </p>
                  ) : null
                }
              >
                {/*
                 * Only the current phase opens. Expanding all ten would be the
                 * old wall of cards again, and collapsing all ten would hide
                 * the only part anybody needs today.
                 */}
                {phase.published && phase.key === activeKey && phase.modules.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {phase.modules.map((entry, index) => (
                      <ModuleBlock
                        key={entry.module.id}
                        number={index + 1}
                        title={entry.module.title}
                        summary={entry.module.summary}
                        href={`/learn/modules/${entry.module.slug}`}
                        next={entry.module.id === nextModuleId}
                        counts={{
                          lessons: entry.lessons.length,
                          lessonsDone: entry.lessonsDone,
                          missions: entry.missions.length,
                          minutes: entry.minutes,
                        }}
                      />
                    ))}
                  </div>
                ) : phase.published && phase.modules[0] ? (
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Link
                      href={`/learn/modules/${phase.modules[0].module.slug}`}
                      className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
                    >
                      {phase.modules.length} {phase.modules.length === 1 ? "module" : "modules"}
                    </Link>
                  </p>
                ) : phase.published ? null : (
                  <PhaseInPreparation summary={`${phase.label} is written before it opens.`} />
                )}
              </PhaseBand>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
