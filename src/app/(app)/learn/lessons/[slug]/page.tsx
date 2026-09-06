import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Badge, Label } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { ContentRenderer } from "@/components/learning/content-renderer";
import {
  CompletionControl,
  ConfidenceControl,
  NotePanel,
} from "@/components/learning/lesson-controls";
import { getLesson } from "@/lib/learning/queries";
import { getToolsForLesson } from "@/lib/toolbox/queries";
import { ContextualTools } from "@/components/toolbox/item-card";
import { SkillTags } from "@/components/progress/skill";
import { getSkillsForLesson } from "@/lib/progress/queries";

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
 * One lesson.
 *
 * The page is thin on purpose: it reads, decides whether the lesson is
 * reachable, and hands the blocks to the renderer. Every judgement it makes —
 * what is unlocked, what has been answered, whether it is complete — comes from
 * the database rather than from anything in the URL.
 *
 * A locked lesson still renders its header and says exactly what is missing.
 * Hiding it entirely would make the shape of the program invisible and turn a
 * prerequisite into a dead end; naming the lesson to finish first turns it into
 * a next step.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getLesson(slug);

  if (!detail) notFound();

  /*
   * The tools this lesson says apply to it. Surfaced here rather than left for
   * the learner to find, which is the whole argument for the join table: nobody
   * should have to guess which item from a growing library is the relevant one.
   */
  const tools = await getToolsForLesson(detail.lesson.id);

  /* What this lesson develops, named on the page. A learner should know what a
     piece of content is for before spending an hour on it. */
  const skills = await getSkillsForLesson(detail.lesson.id);

  const { lesson, blocks, module, phase, resources, prerequisites, unlocked, progress } = detail;
  const completed = progress?.status === "completed";

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={phase && module ? `${phase.label} · ${module.title}` : "Learn"}
        title={lesson.title}
        description={lesson.summary}
        meta={
          <>
            <HeaderMeta label="Type">{lesson.type.replace("_", " ")}</HeaderMeta>
            <HeaderMeta label="Time">{lesson.estimated_minutes} min</HeaderMeta>
            <HeaderMeta label="Level">{lesson.difficulty}</HeaderMeta>
            <HeaderMeta label="Status">{completed ? "Completed" : progress ? "In progress" : "Not started"}</HeaderMeta>
          </>
        }
        action={
          <ButtonLink href="/learn/lessons" variant="secondary" size="sm">
            All lessons
          </ButtonLink>
        }
      />

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
              <SkillTags skills={skills.map((skill) => ({ key: skill.key, label: skill.label }))} />
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
           * Closing the lesson. One band, not three cards: finishing, saying how
           * it landed and keeping a note are one moment, and the page should read
           * as arriving somewhere rather than sprouting more boxes at the end.
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
        </>
      )}

      {prerequisites.length > 0 && unlocked ? (
        <p className="max-w-measure text-sm text-ink-subtle">
          <Badge>Prerequisites met</Badge>
        </p>
      ) : null}
    </div>
  );
}
