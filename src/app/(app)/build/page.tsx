import type { Metadata } from "next";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow, Row, RowValue } from "@/components/ui/list";
import { Icon } from "@/components/ui/icon";
import { Meter } from "@/components/learning/course";
import { EmptyState } from "@/components/states/empty-state";
import { StartProjectForm } from "@/components/workspace/start-project-form";
import { CurrentWork, ProductFacts } from "@/components/workspace/workspace-sections";
import { getWorkspaceSnapshot, getBuildLog, getArtifacts } from "@/lib/workspace/queries";
import { getCurriculum } from "@/lib/learning/queries";
import { getProgressSnapshot } from "@/lib/progress/queries";

export const metadata: Metadata = { title: "My SaaS" };

/**
 * The product workspace: the thing being built, not a second dashboard.
 *
 * Two states, and they are different screens rather than one screen with things
 * hidden. Before a product exists this is a setup step; after, it is the place
 * the learner comes back to.
 *
 * The populated state answers the four questions in the order somebody asks
 * them: what am I building, what do I do now, what is it, and where is what I
 * have made. It deliberately does *not* restate LOCK — there is no roadmap, no
 * lesson list and no achievement wall here. Artifacts and the build log are
 * doors with counts on them, not contents. This is the product's screen; the
 * programme lives in Learn.
 */
export default async function WorkspacePage() {
  const snapshot = await getWorkspaceSnapshot();

  /* ── State A: nothing exists yet ─────────────────────────────────────── */
  if (!snapshot.project) {
    return (
      <Screen
        title="Name what you are building"
        eyebrow="My SaaS"
        width="content"
        lede="LOCK carries one product through the whole programme. Name it, and every mission from here applies to something real."
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-12">
          <Group title="What are you building?" className="rise">
            <div className="px-4 py-4">
              <StartProjectForm />
            </div>
          </Group>

          <Group title="What this sets up" className="rise rise-1">
            {[
              {
                t: "Missions attach to it",
                d: "Every mission produces a deliverable for this product rather than an exercise.",
              },
              {
                t: "Artifacts collect here",
                d: "What you produce is kept, reviewed by your mentor, and kept again.",
              },
              {
                t: "The build log writes itself",
                d: "Submissions, reviews and completions are recorded as they happen.",
              },
            ].map((step, index) => (
              <Row
                key={step.t}
                align="start"
                leading={
                  <span className="flex size-7 items-center justify-center rounded-full bg-ink/[0.06] font-mono text-caption tabular-nums text-ink-subtle">
                    {index + 1}
                  </span>
                }
                title={step.t}
                detail={step.d}
              />
            ))}
          </Group>
        </div>
      </Screen>
    );
  }

  /* ── State B: the workspace ──────────────────────────────────────────── */
  const [curriculum, log, artifacts, progress] = await Promise.all([
    getCurriculum(),
    getBuildLog(),
    getArtifacts(),
    getProgressSnapshot(),
  ]);

  const project = snapshot.project;
  const phaseLabel =
    curriculum.find((entry) => entry.phase.key === project.current_phase)?.phase.label ?? null;

  return (
    <Screen
      title={project.name}
      eyebrow={
        <span className="flex flex-wrap items-center gap-x-2.5">
          <span>My SaaS</span>
          {phaseLabel ? (
            <>
              <span aria-hidden className="text-ink-subtle/50">·</span>
              <span>{phaseLabel}</span>
            </>
          ) : null}
        </span>
      }
      width="content"
      lede={project.description || project.problem_statement || undefined}
    >
      <div className="space-y-10 sm:space-y-12">
        {/* ── How far the product has come ─────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <Meter
            done={snapshot.completedCount}
            total={snapshot.totalCount}
            label="Missions complete"
            className="w-full max-w-56"
          />
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-footnote text-ink-subtle">
            <span>
              <span className="font-mono tabular-nums text-ink">{artifacts.length}</span>{" "}
              {artifacts.length === 1 ? "artifact" : "artifacts"}
            </span>
            {progress.overall?.percent != null ? (
              <span>
                <span className="font-mono tabular-nums text-ink">
                  {progress.overall.percent}%
                </span>{" "}
                of the programme
              </span>
            ) : null}
          </p>
        </div>

        {/* ── What to do now ───────────────────────────────────────────── */}
        <Group title="Current work" className="rise">
          {snapshot.current ? (
            <div className="px-4 py-4">
              <CurrentWork current={snapshot.current} next={snapshot.next} />
            </div>
          ) : (
            <EmptyState title="Nothing open">
              Missions appear here as the curriculum is published. Each one applies
              a lesson to this product and leaves an artifact behind.
            </EmptyState>
          )}
        </Group>

        {/* ── Where the work lives ─────────────────────────────────────── */}
        <Group title="Your work" className="rise rise-1">
          <LinkRow
            href="/build/artifacts"
            leading={<Icon name="note" className="size-[1.15rem] text-ink-subtle" />}
            title="Artifacts"
            detail="What each mission produced, and its review."
            trailing={<RowValue>{artifacts.length}</RowValue>}
          />
          <LinkRow
            href="/build/log"
            leading={<Icon name="list" className="size-[1.15rem] text-ink-subtle" />}
            title="Build log"
            detail="What you decided, when, and why."
            trailing={<RowValue>{log.length}</RowValue>}
          />
        </Group>

        {/* ── What it is ───────────────────────────────────────────────── */}
        <Group
          title="Your product"
          className="rise rise-2"
          footnote="These fill in as the early missions decide what this is."
        >
          <div className="px-4 py-4">
            <ProductFacts project={project} />
          </div>
        </Group>
      </div>
    </Screen>
  );
}
