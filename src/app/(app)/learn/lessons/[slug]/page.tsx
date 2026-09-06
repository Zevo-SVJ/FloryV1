import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Label } from "@/components/ui/surface";
import { StateBlock } from "@/components/states/state-block";
import { ContentRenderer } from "@/components/learning/content-renderer";
import { LessonOutline, MissionCallout, NextUp } from "@/components/learning/course";
import {
  CompletionControl,
  ConfidenceControl,
  NotePanel,
} from "@/components/learning/lesson-controls";
import { getLesson, getLearningState } from "@/lib/learning/queries";
import { getLessonContext } from "@/lib/learning/overview";
import { getToolsForLesson } from "@/lib/toolbox/queries";
import { ContextualTools } from "@/components/toolbox/item-card";
import { SkillTags } from "@/components/progress/skill";
import { getSkillsForLesson } from "@/lib/progress/queries";
import { lessonTypeLabel } from "@/lib/learning/labels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getLesson(slug);
  return { title: detail?.lesson.title ?? "Lesson" };
}

/**
 * One lesson, inside the module it belongs to.
 *
 * Two changes carry this page, and both are about not being a dead end.
 *
 * The outline. A learner reading lesson two of three should be able to see the
 * other two without leaving. It is a sticky column at `xl`, a collapsed
 * disclosure below that — the lesson is what you came for, so on a phone the
 * outline stays shut until asked for.
 *
 * The ending. Finishing used to leave you on a page with nothing after it, so
 * the only route onward was back out to an index — exactly the trip the
 * consolidation removes. Now the bottom of every lesson names the next one, or
 * the mission the module ends in, or the module after that.
 *
 * Everything the page decides — what is unlocked, what has been answered,
 * whether it is complete — still comes from the database rather than the URL.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getLesson(slug);

  if (!detail) notFound();

  const [tools, skills, context, state] = await Promise.all([
    /* The tools this lesson says apply to it. Surfaced here rather than left for
       the learner to find, which is the whole argument for the join table. */
    getToolsForLesson(detail.lesson.id),
    /* What this lesson develops, named on the page. */
    getSkillsForLesson(detail.lesson.id),
    /* Where it sits, and what comes either side. */
    getLessonContext(detail.lesson.id),
    getLearningState(),
  ]);

  const { lesson, blocks, module, phase, resources, prerequisites, unlocked, progress } = detail;
  const completed = progress?.status === "completed";

  const outline = context ? (
    <LessonOutline
      moduleTitle={context.module.module.title}
      moduleHref={`/learn/modules/${context.module.module.slug}`}
      lessons={context.module.lessons.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        done: state.completedLessonIds.has(item.id),
      }))}
      currentId={lesson.id}
      missionTitle={context.module.missions[0]?.mission.title ?? null}
    />
  ) : null;

  return (
    <div className="xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-10">
      {/* The outline renders twice in the markup and once on screen: the
          disclosure above the lesson on narrow screens, the column beside it on
          wide ones. One component, so they cannot disagree. First in source on
          purpose — on a phone "which module is this" is the right thing to read
          before the lesson title, and on a wide screen it is the left column. */}
      <div className="mb-8 xl:mb-0">{outline}</div>

      <div className="min-w-0 space-y-10">
        {/* ── Where you are ────────────────────────────────────────────── */}
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href="/learn" className="label text-ink-subtle transition-colors hover:text-ink">
              Learn
            </Link>
            {phase ? (
              <>
                <span aria-hidden className="label text-border-strong">/</span>
                <span className="label text-ink-subtle">{phase.label}</span>
              </>
            ) : null}
            {module ? (
              <>
                <span aria-hidden className="label text-border-strong">/</span>
                <Link
                  href={`/learn/modules/${module.slug}`}
                  className="label text-ink-muted transition-colors hover:text-ink"
                >
                  {module.title}
                </Link>
              </>
            ) : null}
          </nav>

          <div className="space-y-2">
            {context ? (
              <p className="label tabular-nums text-accent">
                Lesson {String(context.index + 1).padStart(2, "0")} of{" "}
                {String(context.total).padStart(2, "0")}
              </p>
            ) : null}
            <h1 className="text-display max-w-measure text-balance">{lesson.title}</h1>
            {lesson.summary ? (
              <p className="max-w-measure text-lede text-ink-muted">{lesson.summary}</p>
            ) : null}
          </div>

          <p className="label flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-border py-3 text-ink-subtle">
            <span>{lessonTypeLabel(lesson.type)}</span>
            <span className="tabular-nums">{lesson.estimated_minutes} min</span>
            <span>{lesson.difficulty}</span>
            <span className={completed ? "text-ink-muted" : undefined}>
              {completed ? "Completed" : progress ? "In progress" : "Not started"}
            </span>
          </p>
        </header>

        {lesson.is_demo ? (
          <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
            Demo content. It exists to prove the learning engine works end to end,
            and is replaced when the curriculum is written.
          </p>
        ) : null}

        {!unlocked ? (
          <StateBlock
            as="h2"
            eyebrow="Locked"
            title="Finish the earlier lesson first"
            description="This one builds on material you have not covered yet. The point is not to slow you down — it is that the ideas below only make sense with the ground under them."
          >
            <ul className="space-y-2 pt-2">
              {prerequisites.map(({ lesson: required, met }) => (
                <li key={required.id}>
                  <Link
                    href={`/learn/lessons/${required.slug}`}
                    className="text-sm text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                  >
                    {required.title}
                  </Link>
                  <span className="label ml-3 text-ink-subtle">{met ? "Done" : "Not done"}</span>
                </li>
              ))}
            </ul>
          </StateBlock>
        ) : (
          <>
            {skills.length > 0 ? (
              <div className="max-w-measure">
                <SkillTags
                  skills={skills.map((skill) => ({ key: skill.key, label: skill.label }))}
                />
              </div>
            ) : null}

            {lesson.objectives.length > 0 ? (
              <section className="max-w-measure space-y-3">
                <Label as="h2">What you will be able to do</Label>
                <ul className="space-y-1.5">
                  {lesson.objectives.map((objective) => (
                    <li key={objective} className="flex gap-3 text-[0.9375rem] text-ink-muted">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-border-strong" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <ContentRenderer
              blocks={blocks}
              lessonId={lesson.id}
              lessonSlug={lesson.slug}
              responses={detail.responses}
            />

            {detail.rejectedBlocks > 0 ? (
              <p className="max-w-measure border-l-2 border-danger py-1 pl-4 text-sm text-danger">
                {detail.rejectedBlocks} block
                {detail.rejectedBlocks === 1 ? "" : "s"} in this lesson could not be
                read and {detail.rejectedBlocks === 1 ? "was" : "were"} left out. The
                rest of the lesson is intact.
              </p>
            ) : null}

            <ContextualTools items={tools} heading="Tools for this lesson" />

            {resources.length > 0 ? (
              <section className="max-w-measure space-y-3">
                <Label as="h2">Going further</Label>
                <ul className="divide-y divide-border border-y border-border">
                  {resources.map((resource) => (
                    <li key={resource.id}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="-mx-3 block rounded-control px-3 py-3.5 transition-colors hover:bg-surface-sunken"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="label text-ink-subtle">{resource.kind}</span>
                          {resource.source ? (
                            <span className="label text-ink-subtle">{resource.source}</span>
                          ) : null}
                          {resource.duration_seconds ? (
                            <span className="label text-ink-subtle tabular-nums">
                              {Math.round(resource.duration_seconds / 60)} min
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[0.9375rem] font-medium text-ink underline decoration-border-strong underline-offset-4">
                          {resource.title}
                        </p>
                        <p className="mt-2 text-sm text-ink-muted">
                          <span className="label mr-2 text-ink-subtle">Why watch this</span>
                          {resource.why}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/*
             * Closing the lesson. One band, not three cards: finishing, saying
             * how it landed and keeping a note are one moment, and the page
             * should read as arriving somewhere rather than sprouting more
             * boxes at the end.
             */}
            <section className="max-w-measure border-t-2 border-border-strong pt-8">
              <Label as="h2" className="text-ink">
                Close this lesson
              </Label>

              <div className="mt-6 space-y-7">
                <CompletionControl
                  lessonId={lesson.id}
                  lessonSlug={lesson.slug}
                  rule={lesson.completion_rule}
                  completed={completed}
                />

                <div className="border-t border-border pt-6">
                  <ConfidenceControl
                    lessonId={lesson.id}
                    lessonSlug={lesson.slug}
                    current={progress?.confidence ?? null}
                  />
                </div>

                <div className="border-t border-border pt-6">
                  <NotePanel lessonId={lesson.id} lessonSlug={lesson.slug} note={detail.note} />
                </div>
              </div>
            </section>

            {/* ── Where you go next ────────────────────────────────────── */}
            <Onward context={context} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The end of a lesson is the start of the next thing.
 *
 * Three cases, in the order the curriculum runs them: another lesson in this
 * module, then the mission the module ends in, then the next module. The
 * mission only appears from the last lesson — offering it from lesson one would
 * invite skipping the teaching it applies.
 */
function Onward({
  context,
}: {
  context: Awaited<ReturnType<typeof getLessonContext>>;
}) {
  if (!context) return null;

  const previous = context.previous
    ? { title: context.previous.title, href: `/learn/lessons/${context.previous.slug}` }
    : null;

  if (context.next) {
    return (
      <NextUp
        eyebrow="Next lesson"
        title={context.next.title}
        description={context.next.summary}
        href={`/learn/lessons/${context.next.slug}`}
        action="Next lesson"
        previous={previous}
      />
    );
  }

  if (context.mission) {
    return (
      <div className="space-y-6">
        <p className="label border-t-2 border-border-strong pt-6 text-accent">
          That is every lesson in this module
        </p>
        <MissionCallout entry={context.mission} heading="Now apply it" />
        {previous ? (
          <p className="border-t border-border pt-3 text-sm">
            <span className="label mr-3 text-ink-subtle">Previous</span>
            <Link
              href={previous.href}
              className="text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
            >
              {previous.title}
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  if (context.nextModule) {
    return (
      <NextUp
        eyebrow={`Next in ${context.phase.label}`}
        title={context.nextModule.module.title}
        description={context.nextModule.module.summary}
        href={`/learn/modules/${context.nextModule.module.slug}`}
        action="Open the next module"
        previous={previous}
      />
    );
  }

  return (
    <NextUp
      eyebrow="End of the phase"
      title={`You have reached the end of ${context.phase.label}`}
      description="Learn shows what opens next, and everything you have produced so far."
      href="/learn"
      action="Back to Learn"
      previous={previous}
    />
  );
}
