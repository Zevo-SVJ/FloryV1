import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { ContentRenderer } from "@/components/learning/content-renderer";
import { MissionWorkspace } from "@/components/workspace/mission-workspace";
import { getMission } from "@/lib/workspace/queries";
import { getToolsForMission } from "@/lib/toolbox/queries";
import { getArtifactFeedback } from "@/lib/mentor/queries";
import { FeedbackHistory } from "@/components/mentor/feedback";
import { AskMentorForm } from "@/components/mentor/ask-form";
import { ContextualTools } from "@/components/toolbox/item-card";
import { SkillTags } from "@/components/progress/skill";
import { getSkillsForMission } from "@/lib/progress/queries";
import { MISSION_STATUS_LABEL, MISSION_TYPE_LABEL, EVIDENCE_KIND_LABEL } from "@/lib/workspace/labels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getMission(slug);
  return { title: detail?.mission.title ?? "Mission" };
}

/**
 * One mission, in the order somebody actually works.
 *
 * Objective, why it matters, the task, the context, then the workspace. That
 * sequence is the argument the whole prompt makes: a mission is a piece of
 * founder work with a reason behind it, not an assignment with instructions.
 *
 * Everything above the workspace is content, rendered by the same block
 * renderer a lesson uses — the same headings, callouts, checklists and prompts.
 * Sharing it was the point of building it as a registry.
 *
 * A locked mission still shows its objective and names exactly what to finish
 * first. Hiding it would turn a prerequisite into a dead end.
 */
export default async function MissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getMission(slug);

  if (!detail) notFound();

  // What to reach for while doing this mission. See the lesson page for why.
  const tools = await getToolsForMission(detail.mission.id);

  /* What this mission practises. The primary one is marked — a mission is
     usually about one skill and touches several. */
  const skills = await getSkillsForMission(detail.mission.id);

  /*
   * Every review this deliverable has had, oldest kept. Shown on the mission
   * rather than only in the mentor area, because the feedback is about the work
   * and the work is here — a learner acting on "needs work" should not have to
   * navigate away from the thing they are fixing.
   */
  const feedback = detail.artifact ? await getArtifactFeedback(detail.artifact.id) : [];

  const { mission, progress, artifact, blocks, evidence, prerequisites, requiredLesson, unlocked, project } =
    detail;
  const status = progress?.status ?? "not_started";

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`Mission · ${MISSION_TYPE_LABEL[mission.type]}`}
        title={mission.title}
        description={mission.summary}
        meta={
          <>
            <HeaderMeta label="Time">{mission.estimated_minutes} min</HeaderMeta>
            <HeaderMeta label="Level">{mission.difficulty}</HeaderMeta>
            <HeaderMeta label="Status">{MISSION_STATUS_LABEL[status]}</HeaderMeta>
            <HeaderMeta label="Produces">{mission.deliverable_title}</HeaderMeta>
          </>
        }
        action={
          <ButtonLink href="/learn/missions" variant="secondary" size="sm">
            All missions
          </ButtonLink>
        }
      />

      {mission.is_demo ? (
        <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
          Demo mission. It exists to prove the work layer runs end to end.
        </p>
      ) : null}

      {!unlocked ? (
        <StateBlock
          as="h2"
          eyebrow="Locked"
          title="Finish the groundwork first"
          description="This mission applies something you have not covered yet. The lock is not there to slow you down — doing the work without the ground under it produces an artifact you cannot defend."
        >
          <ul className="space-y-2 pt-2">
            {requiredLesson && !requiredLesson.met ? (
              <li>
                <Link
                  href={`/learn/lessons/${requiredLesson.slug}`}
                  className="text-sm text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  {requiredLesson.title}
                </Link>
                <span className="label ml-3 text-ink-subtle">Lesson · not done</span>
              </li>
            ) : null}
            {prerequisites
              .filter((entry) => !entry.met)
              .map((entry) => (
                <li key={entry.mission.id}>
                  <Link
                    href={`/learn/missions/${entry.mission.slug}`}
                    className="text-sm text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                  >
                    {entry.mission.title}
                  </Link>
                  <span className="label ml-3 text-ink-subtle">Mission · not done</span>
                </li>
              ))}
          </ul>
        </StateBlock>
      ) : (
        <>
          <section className="max-w-measure space-y-6">
            <div className="space-y-2">
              <Label>Objective</Label>
              <p className="text-[1.0625rem] leading-relaxed text-ink">{mission.objective}</p>
            </div>

            {mission.why_it_matters ? (
              <aside className="rounded-card border-l-2 border-accent bg-accent-quiet/40 py-4 pr-4 pl-5">
                <p className="label mb-2 text-accent">Why this matters</p>
                <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
                  {mission.why_it_matters}
                </p>
              </aside>
            ) : null}

            {skills.length > 0 ? (
              <SkillTags
                heading="Practises"
                skills={skills.map(({ skill }) => ({ key: skill.key, label: skill.label }))}
                primaryKey={skills.find(({ isPrimary }) => isPrimary)?.skill.key}
              />
            ) : null}

            {mission.objectives.length > 0 ? (
              <div className="space-y-3">
                <Label>You will leave with</Label>
                <ul className="space-y-1.5">
                  {mission.objectives.map((objective) => (
                    <li key={objective} className="flex gap-3 text-[0.9375rem] text-ink-muted">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-border-strong" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {requiredLesson ? (
              <p className="text-sm text-ink-subtle">
                <span className="label mr-2">Applies</span>
                <Link
                  href={`/learn/lessons/${requiredLesson.slug}`}
                  className="text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  {requiredLesson.title}
                </Link>
              </p>
            ) : null}
          </section>

          <ContentRenderer
            blocks={blocks}
            lessonId={mission.id}
            lessonSlug={mission.slug}
            responses={new Map()}
          />

          <ContextualTools items={tools} heading="Tools for this mission" />

          <section className="max-w-measure space-y-3">
            <Label as="h2">Deliverable</Label>
            <Card className="space-y-2 p-5">
              <p className="text-[0.9375rem] font-medium text-ink">{mission.deliverable_title}</p>
              <p className="text-sm text-ink-muted">{mission.deliverable_description}</p>
              {mission.required_evidence.length > 0 ? (
                <p className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="label text-ink-subtle">Proof required</span>
                  {mission.required_evidence.map((kind) => (
                    <Badge key={kind} tone="accent">
                      {EVIDENCE_KIND_LABEL[kind]}
                    </Badge>
                  ))}
                </p>
              ) : null}
            </Card>
          </section>

          <FeedbackHistory history={feedback} />

          {project ? (
            <MissionWorkspace
              mission={mission}
              projectId={project.id}
              artifact={artifact}
              evidence={evidence}
              reflection={progress?.reflection ?? ""}
              completed={status === "completed"}
            />
          ) : (
            <StateBlock
              as="h2"
              eyebrow="No project yet"
              title="Name your SaaS first"
              description="A mission produces something, and that something belongs to a product. Start yours and come back — this page will be waiting."
              actions={<ButtonLink href="/build" size="sm">Start my SaaS</ButtonLink>}
            />
          )}

          {/* Stuck? Ask, with the mission and the deliverable attached — a
              question with its context behind it can be answered by somebody
              looking at the same thing. */}
          {project ? (
            <section className="max-w-measure">
              <AskMentorForm
                projectId={project.id}
                missionId={mission.id}
                artifactId={artifact?.id ?? null}
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
