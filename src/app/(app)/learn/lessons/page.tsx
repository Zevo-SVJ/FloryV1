import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { LessonRow } from "@/components/learning/hierarchy";
import { getLearningOverview } from "@/lib/learning/overview";
import { getLearningState } from "@/lib/learning/queries";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Lessons" };

/**
 * The teaching, arranged around where the learner actually is.
 *
 * The old page listed all ten phases at equal weight, so nine tenths of it read
 * "No modules published in this phase yet." — a page that is mostly an apology.
 * This opens on the current phase with its modules and lessons in full, and
 * reduces the rest to a compact index that still shows the shape of the whole
 * curriculum without pretending each empty phase deserves a section.
 *
 * The lessons themselves are rows on dividers rather than cards. A curriculum
 * is mostly lessons; a card each is what made the old page a wall.
 */
export default async function LessonsPage() {
  const [overview, state] = await Promise.all([getLearningOverview(), getLearningState()]);
  const { phases, activeKey, nextLesson, completedLessons, totalLessons } = overview;

  const open = phases.find((p) => p.key === activeKey) ?? phases.find((p) => p.published) ?? null;
  const rest = phases.filter((p) => p.key !== open?.key);
  const anyPublished = phases.some((p) => p.published);

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="label text-ink-subtle">Learn</p>
        <h1 className="text-display max-w-measure text-balance">Lessons</h1>
        <p className="max-w-measure text-lede text-ink-muted">
          The teaching inside each phase. You do them in order, because each one
          is the input to the next.
        </p>

        {totalLessons > 0 ? (
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1">
            <span className="label tabular-nums text-ink-subtle">
              {completedLessons}/{totalLessons} complete
            </span>
            {state.revisitLessonIds.size > 0 ? (
              <span className="label tabular-nums text-ink-subtle">
                {state.revisitLessonIds.size} to revisit
              </span>
            ) : null}
          </p>
        ) : null}
      </header>

      {!anyPublished ? (
        <section className="border-y border-border py-8">
          <p className="label text-ink-subtle">In preparation</p>
          <p className="mt-2 max-w-measure text-lede text-ink-muted">
            No lessons are open yet. The roadmap shows the ten phases the
            curriculum is being written into.
          </p>
          <p className="mt-4">
            <ButtonLink href="/learn" size="sm">See the roadmap</ButtonLink>
          </p>
        </section>
      ) : null}

      {/* ── The phase you are in, in full ────────────────────────────────── */}
      {open && open.published ? (
        <section className="space-y-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border pb-2">
            <h2 className="flex flex-wrap items-baseline gap-x-3">
              <span className="label tabular-nums text-ink-subtle">
                {String(open.number).padStart(2, "0")}
              </span>
              <span className="text-title">{open.label}</span>
              <span className="label text-accent">You are here</span>
            </h2>
            <span className="label tabular-nums text-ink-subtle">
              {open.lessonsDone}/{open.lessonCount} lessons
            </span>
          </div>

          {open.modules.map((entry, index) => (
            <div key={entry.module.id} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="flex flex-wrap items-baseline gap-x-3">
                  <span className="label tabular-nums text-ink-subtle">
                    Module {String(index + 1).padStart(2, "0")}
                  </span>
                  <Link
                    href={`/learn/modules/${entry.module.slug}`}
                    className="text-[1.0625rem] font-medium tracking-tight text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-border-strong"
                  >
                    {entry.module.title}
                  </Link>
                </h3>
                <span className="label tabular-nums text-ink-subtle">
                  {entry.lessonsDone}/{entry.lessons.length} · ~{entry.minutes} min
                </span>
              </div>

              {entry.module.summary ? (
                <p className="max-w-measure pb-1 text-sm leading-relaxed text-ink-muted">
                  {entry.module.summary}
                </p>
              ) : null}

              <ol className="divide-y divide-border border-t border-border">
                {entry.lessons.map((lesson, i) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={i + 1}
                    done={state.completedLessonIds.has(lesson.id)}
                    revisit={state.revisitLessonIds.has(lesson.id)}
                    next={nextLesson?.lesson.id === lesson.id}
                  />
                ))}
              </ol>
            </div>
          ))}
        </section>
      ) : null}

      {/* ── Everything else, as an index ─────────────────────────────────── */}
      <section className="space-y-1">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          The rest of the journey
        </h2>

        <ol className="divide-y divide-border">
          {rest.map((phase) => (
            <li key={phase.key}>
              {phase.published ? (
                <Link
                  href={
                    phase.modules[0]
                      ? `/learn/modules/${phase.modules[0].module.slug}`
                      : "/learn"
                  }
                  className="-mx-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-control px-3 py-3 transition-colors hover:bg-surface-sunken"
                >
                  <PhaseIndexRow phase={phase} />
                </Link>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-3">
                  <PhaseIndexRow phase={phase} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <p className="max-w-measure border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
        Lessons marked <span className="text-ink-muted">Demo</span> exist to prove
        the learning engine runs end to end. The curriculum itself is written in a
        later phase.
      </p>
    </div>
  );
}

/** One phase, as an index line. Compact enough that ten of them are a map. */
function PhaseIndexRow({
  phase,
}: {
  phase: Awaited<ReturnType<typeof getLearningOverview>>["phases"][number];
}) {
  return (
    <>
      <span className="label w-6 shrink-0 tabular-nums text-ink-subtle">
        {String(phase.number).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "text-[0.9375rem] font-medium",
          phase.published ? "text-ink" : "text-ink-muted",
        )}
      >
        {phase.label}
      </span>
      <span className="min-w-0 flex-1 text-sm text-ink-subtle">{phase.summary}</span>
      <span className="label shrink-0 tabular-nums text-ink-subtle">
        {phase.published ? `${phase.lessonsDone}/${phase.lessonCount}` : "In preparation"}
      </span>
    </>
  );
}
