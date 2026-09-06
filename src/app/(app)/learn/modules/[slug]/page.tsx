import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow } from "@/components/ui/list";
import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { Icon, StatusMark } from "@/components/ui/icon";
import { Meter, MissionCallout, NextUp } from "@/components/learning/course";
import { getModuleBySlug } from "@/lib/learning/overview";
import { getLearningState } from "@/lib/learning/queries";
import { lessonTypeLabel } from "@/lib/learning/labels";

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
 * the screen a learner comes back to. It answers, in order: where am I, what
 * will I be able to do, how far am I, what are the lessons, what do I produce,
 * and what is after this.
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
      <Screen title="Module" back={{ href: "/learn", label: "Learn" }} width="read" hideTitle>
        <StateBlock
          eyebrow="Being written"
          title="This module is not open yet"
          description="It exists, and it opens when its lessons are written. Learn shows everything that is available now."
          actions={<ButtonLink href="/learn" size="sm">Back to Learn</ButtonLink>}
        />
      </Screen>
    );
  }

  const { phase, module: entry } = found;
  const state = await getLearningState();

  const complete = entry.lessons.length > 0 && entry.lessonsDone === entry.lessons.length;
  const nextModule = phase.modules[entry.number] ?? null;
  const mission = entry.missions[0] ?? null;

  return (
    <Screen
      title={entry.module.title}
      back={{ href: "/learn", label: "Learn" }}
      width="content"
      eyebrow={
        <span className="flex flex-wrap items-center gap-x-2">
          <span className="font-mono tabular-nums">
            {String(phase.number).padStart(2, "0")}
          </span>
          <span>{phase.label}</span>
          <span aria-hidden className="text-ink-subtle/50">·</span>
          <span>Module {String(entry.number).padStart(2, "0")}</span>
        </span>
      }
      lede={entry.module.summary || undefined}
    >
      <div className="space-y-10 sm:space-y-12">
        {/* ── How far ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {entry.lessons.length > 0 ? (
            <Meter
              done={entry.lessonsDone}
              total={entry.lessons.length}
              label={`Progress in ${entry.module.title}`}
              className="w-full max-w-56"
            />
          ) : null}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-ink-subtle">
            {entry.minutes > 0 ? (
              <span className="flex items-center gap-1.5">
                <Icon name="clock" className="size-3.5" />
                <span className="font-mono tabular-nums">~{entry.minutes} min</span>
              </span>
            ) : null}
            <span>
              {complete ? "Complete" : entry.lessonsDone > 0 ? "In progress" : "Not started"}
            </span>
          </p>
        </div>

        {/* ── What you get out of it ──────────────────────────────────────── */}
        {entry.objectives.length > 0 ? (
          <section className="rise">
            <h2 className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
              What you will be able to do
            </h2>
            <ul className="mt-3 space-y-2.5">
              {entry.objectives.slice(0, 6).map((objective) => (
                <li key={objective} className="flex max-w-read gap-3 text-body text-ink-muted">
                  <Icon name="check" className="mt-1.5 size-4 shrink-0 text-accent" strokeWidth="2.4" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── The lessons ─────────────────────────────────────────────────── */}
        <Group
          title="Lessons"
          className="rise rise-1"
          action={
            entry.nextLesson ? (
              <ButtonLink href={`/learn/lessons/${entry.nextLesson.slug}`} variant="accent" size="sm">
                {entry.lessonsDone > 0 ? "Continue" : "Start"}
              </ButtonLink>
            ) : null
          }
        >
          {entry.lessons.length === 0 ? (
            <p className="px-4 py-6 text-subhead text-ink-subtle">
              The lessons for this module are being written.
            </p>
          ) : (
            entry.lessons.map((lesson, i) => {
              const done = state.completedLessonIds.has(lesson.id);
              const next = entry.nextLesson?.id === lesson.id;
              return (
                <LinkRow
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.slug}`}
                  align="start"
                  leading={
                    <StatusMark
                      state={done ? "done" : next ? "current" : "todo"}
                      index={done || next ? undefined : i + 1}
                    />
                  }
                  title={
                    <span className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className={done ? "font-normal text-ink-muted" : undefined}>
                        {lesson.title}
                      </span>
                      {next ? (
                        <span className="text-caption font-semibold text-accent uppercase">
                          Next
                        </span>
                      ) : null}
                      {state.revisitLessonIds.has(lesson.id) ? (
                        <span className="text-caption text-ink-subtle uppercase">Revisit</span>
                      ) : null}
                    </span>
                  }
                  detail={lesson.summary}
                  trailing={
                    <span className="hidden text-right sm:block">
                      <span className="block">{lessonTypeLabel(lesson.type)}</span>
                      <span className="mt-0.5 block font-mono tabular-nums">
                        {lesson.estimatedMinutes} min
                      </span>
                    </span>
                  }
                />
              );
            })
          )}
        </Group>

        {/* ── What it produces ────────────────────────────────────────────── */}
        {mission ? (
          <div className="rise rise-2">
            <MissionCallout entry={mission} ready={entry.nextLesson === null} />
          </div>
        ) : null}

        {/* ── What comes after ────────────────────────────────────────────── */}
        {nextModule ? (
          <NextUp
            eyebrow={`Next in ${phase.label}`}
            title={nextModule.module.title}
            description={nextModule.module.summary}
            href={`/learn/modules/${nextModule.module.slug}`}
            action="Open"
            emphasis={mission ? "secondary" : "primary"}
          />
        ) : (
          <NextUp
            eyebrow={`Last module in ${phase.label}`}
            title="Finishing this one closes the phase"
            description="Learn shows what opens next, and everything you have produced so far."
            href="/learn"
            action="Back to Learn"
            emphasis="secondary"
          />
        )}
      </div>
    </Screen>
  );
}
