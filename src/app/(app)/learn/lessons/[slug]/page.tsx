import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen } from "@/components/ui/screen";
import { StateBlock } from "@/components/states/state-block";
import { ContentRenderer } from "@/components/learning/content-renderer";
import { MissionCallout, NextUp } from "@/components/learning/course";
import { OutlineSheet } from "@/components/learning/outline-sheet";
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
import { Icon } from "@/components/ui/icon";
import { Group, LinkRow } from "@/components/ui/list";

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
 * One lesson: a reading environment, not a page of fields.
 *
 * Everything here serves one sentence — the content is the product, so the
 * interface gets out of its way.
 *
 *   · A `read` column. Prose at 58rem is uncomfortable and prose at full width
 *     is unreadable; this stops where a line stops being easy to follow.
 *   · The outline is a toolbar control, not a column. A table of contents
 *     beside the thing you are reading competes with it.
 *   · The ending is forward motion. Finishing used to leave the learner on a
 *     screen with nowhere to go, so the only route onward was back out to an
 *     index — exactly the trip the product's structure exists to remove.
 *
 * Everything the screen decides — what is unlocked, what has been answered,
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
    /* The tools this lesson says apply to it. Surfaced here rather than left
       for the learner to find, which is the argument for the join table. */
    getToolsForLesson(detail.lesson.id),
    getSkillsForLesson(detail.lesson.id),
    getLessonContext(detail.lesson.id),
    getLearningState(),
  ]);

  const { lesson, blocks, module, phase, resources, prerequisites, unlocked, progress } = detail;
  const completed = progress?.status === "completed";

  return (
    <Screen
      title={lesson.title}
      width="read"
      back={
        module
          ? { href: `/learn/modules/${module.slug}`, label: module.title }
          : { href: "/learn", label: "Learn" }
      }
      actions={
        context ? (
          <OutlineSheet
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
        ) : null
      }
      eyebrow={
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {context ? (
            <span className="font-mono tabular-nums text-accent">
              Lesson {String(context.index + 1).padStart(2, "0")} of{" "}
              {String(context.total).padStart(2, "0")}
            </span>
          ) : null}
          {phase ? <span>{phase.label}</span> : null}
        </span>
      }
      lede={lesson.summary || undefined}
    >
      <div className="space-y-10">
        {/* ── What kind of thing this is ──────────────────────────────────── */}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-ink-subtle">
          <span>{lessonTypeLabel(lesson.type)}</span>
          <span className="flex items-center gap-1.5">
            <Icon name="clock" className="size-3.5" />
            <span className="font-mono tabular-nums">{lesson.estimated_minutes} min</span>
          </span>
          {completed ? (
            <span className="flex items-center gap-1.5 text-success">
              <Icon name="check" className="size-3.5" strokeWidth="2.6" />
              Completed
            </span>
          ) : null}
        </p>

        {lesson.is_demo ? (
          <p className="text-footnote text-ink-subtle">
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
            <div className="w-full pt-2">
              <Group>
                {prerequisites.map(({ lesson: required, met }) => (
                  <LinkRow
                    key={required.id}
                    href={`/learn/lessons/${required.slug}`}
                    title={required.title}
                    trailing={met ? "Done" : "Not done"}
                  />
                ))}
              </Group>
            </div>
          </StateBlock>
        ) : (
          <>
            {skills.length > 0 ? (
              <SkillTags skills={skills.map((skill) => ({ key: skill.key, label: skill.label }))} />
            ) : null}

            {lesson.objectives.length > 0 ? (
              <section>
                <h2 className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
                  What you will be able to do
                </h2>
                <ul className="mt-3 space-y-2">
                  {lesson.objectives.map((objective) => (
                    <li key={objective} className="flex gap-3 text-body text-ink-muted">
                      <Icon
                        name="check"
                        className="mt-1.5 size-4 shrink-0 text-accent"
                        strokeWidth="2.4"
                      />
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
              <p className="rounded-card bg-danger/10 px-4 py-3 text-subhead text-danger">
                {detail.rejectedBlocks} block
                {detail.rejectedBlocks === 1 ? "" : "s"} in this lesson could not be
                read and {detail.rejectedBlocks === 1 ? "was" : "were"} left out. The
                rest of the lesson is intact.
              </p>
            ) : null}

            <ContextualTools items={tools} heading="Tools for this lesson" />

            {resources.length > 0 ? (
              <Group title="Going further">
                {resources.map((resource) => (
                  <LinkRow
                    key={resource.id}
                    href={resource.url}
                    external
                    align="start"
                    title={resource.title}
                    detail={
                      <>
                        {resource.why}
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-footnote text-ink-subtle">
                          <span>{resource.kind}</span>
                          {resource.source ? <span>{resource.source}</span> : null}
                          {resource.duration_seconds ? (
                            <span className="font-mono tabular-nums">
                              {Math.round(resource.duration_seconds / 60)} min
                            </span>
                          ) : null}
                        </span>
                      </>
                    }
                  />
                ))}
              </Group>
            ) : null}

            {/*
             * Closing the lesson. One group, not three cards: finishing, saying
             * how it landed and keeping a note are one moment, and the screen
             * should read as arriving somewhere rather than sprouting more
             * boxes at the end.
             */}
            <Group title="Close this lesson">
              <div className="px-4 py-4">
                <CompletionControl
                  lessonId={lesson.id}
                  lessonSlug={lesson.slug}
                  rule={lesson.completion_rule}
                  completed={completed}
                />
              </div>
              <div className="relative px-4 py-4 before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-separator">
                <ConfidenceControl
                  lessonId={lesson.id}
                  lessonSlug={lesson.slug}
                  current={progress?.confidence ?? null}
                />
              </div>
              <div className="relative px-4 py-4 before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-separator">
                <NotePanel lessonId={lesson.id} lessonSlug={lesson.slug} note={detail.note} />
              </div>
            </Group>

            {/* ── Where you go next ────────────────────────────────────────── */}
            <Onward context={context} />
          </>
        )}
      </div>
    </Screen>
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
        action="Continue"
        previous={previous}
      />
    );
  }

  if (context.mission) {
    return (
      <div className="space-y-4">
        <p className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          That is every lesson in this module
        </p>
        <MissionCallout entry={context.mission} heading="Now apply it" />
        {previous ? (
          <p className="px-1">
            <Link
              href={previous.href}
              className="tactile inline-flex items-center gap-1.5 text-subhead text-ink-subtle hover:text-ink"
            >
              <Icon name="back" className="size-4" strokeWidth="2.2" />
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
        action="Open"
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
