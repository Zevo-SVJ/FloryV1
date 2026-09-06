import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { LessonRow } from "@/components/learning/hierarchy";
import { CourseProgress, MissionCallout, NextUp } from "@/components/learning/course";
import { getModuleBySlug } from "@/lib/learning/overview";
import { getLearningState } from "@/lib/learning/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await getModuleBySlug(slug);
  return { title: found?.module?.module.title ?? "Module" };
}

/**
 * A module: the unit a learner opens, works through and finishes.
 *
 * Phases are too big to be a unit of work and lessons are too small, so this is
 * the page a learner spends their time choosing between and coming back to. It
 * answers, in order: where am I, what will I be able to do, how far am I, what
 * are the lessons, what do I produce, and what is after this.
 *
 * "What you will learn" is gathered from the lessons rather than stored on the
 * module. The claim belongs to the lesson that makes it; a second copy on the
 * module is a second thing that can quietly stop being true.
 */
export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = await getModuleBySlug(slug);
  if (!found) notFound();

  // The module exists but is not published for this reader.
  if (!found.module || !found.phase) {
    return (
      <StateBlock
        eyebrow="Not published"
        title="This module is still being written"
        description="It exists, but it is not open yet. Learn shows everything that is available now."
        actions={<ButtonLink href="/learn" size="sm">Back to Learn</ButtonLink>}
      />
    );
  }

  const { phase, module: entry } = found;
  const state = await getLearningState();

  const complete = entry.lessons.length > 0 && entry.lessonsDone === entry.lessons.length;
  const nextModule = phase.modules[entry.number] ?? null;
  const mission = entry.missions[0] ?? null;

  return (
    <div className="space-y-12">
      {/* ── Where this sits ──────────────────────────────────────────────── */}
      <header className="space-y-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/learn" className="label text-ink-subtle transition-colors hover:text-ink">
            Learn
          </Link>
          <span aria-hidden className="label text-border-strong">/</span>
          <span className="label text-ink-subtle">
            {String(phase.number).padStart(2, "0")} {phase.label}
          </span>
          <span aria-hidden className="label text-border-strong">/</span>
          <span className="label text-ink-muted">
            Module {String(entry.number).padStart(2, "0")}
          </span>
        </nav>

        <div className="space-y-2">
          <h1 className="text-display max-w-measure text-balance">{entry.module.title}</h1>
          {entry.module.summary ? (
            <p className="max-w-measure text-lede text-ink-muted">{entry.module.summary}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          {entry.lessons.length > 0 ? (
            <CourseProgress
              done={entry.lessonsDone}
              total={entry.lessons.length}
              label={`Progress in ${entry.module.title}`}
              className="w-full sm:max-w-xs"
            />
          ) : (
            <p className="label text-ink-subtle">Being written</p>
          )}

          <p className="label flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-subtle">
            {mission ? <span>1 mission</span> : null}
            {entry.minutes > 0 ? (
              <span className="tabular-nums">~{entry.minutes} min</span>
            ) : null}
            <span className="text-ink-muted">
              {complete ? "Complete" : entry.lessonsDone > 0 ? "In progress" : "Not started"}
            </span>
          </p>
        </div>
      </header>

      {/* ── What you get out of it ───────────────────────────────────────── */}
      {entry.objectives.length > 0 ? (
        <section className="space-y-3">
          <h2 className="label text-ink-subtle">What you will be able to do</h2>
          <ul className="space-y-2">
            {entry.objectives.slice(0, 6).map((objective) => (
              <li
                key={objective}
                className="flex max-w-measure gap-3 text-[0.9375rem] leading-relaxed text-ink-muted"
              >
                <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-accent" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── The lessons ──────────────────────────────────────────────────── */}
      <section className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
          <h2 className="label text-ink-subtle">Lessons</h2>
          {entry.nextLesson ? (
            <ButtonLink href={`/learn/lessons/${entry.nextLesson.slug}`} size="sm">
              {entry.lessonsDone > 0 ? "Continue" : "Start"}
            </ButtonLink>
          ) : null}
        </div>

        {entry.lessons.length === 0 ? (
          <p className="py-6 text-sm text-ink-subtle">
            The lessons for this module are being written.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {entry.lessons.map((lesson, i) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={i + 1}
                done={state.completedLessonIds.has(lesson.id)}
                revisit={state.revisitLessonIds.has(lesson.id)}
                next={entry.nextLesson?.id === lesson.id}
              />
            ))}
          </ol>
        )}
      </section>

      {/* ── What it produces ─────────────────────────────────────────────── */}
      {mission ? <MissionCallout entry={mission} /> : null}

      {/* ── What comes after ─────────────────────────────────────────────── */}
      {nextModule ? (
        <NextUp
          eyebrow={`Next in ${phase.label}`}
          title={nextModule.module.title}
          description={nextModule.module.summary}
          href={`/learn/modules/${nextModule.module.slug}`}
          action="Open the next module"
          emphasis={mission ? "secondary" : "primary"}
        />
      ) : (
        <section className="border-t-2 border-border-strong pt-6">
          <p className="label text-ink-subtle">
            Last module in {String(phase.number).padStart(2, "0")} {phase.label}
          </p>
          <p className="mt-2 max-w-measure text-sm leading-relaxed text-ink-muted">
            Finishing this one closes the phase. Learn shows what opens next.
          </p>
          <div className="mt-5">
            <ButtonLink href="/learn" variant="secondary" size="sm">
              Back to Learn
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
