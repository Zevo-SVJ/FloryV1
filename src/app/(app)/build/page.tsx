import type { Metadata } from "next";
import { Card } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { ProductHeader } from "@/components/workspace/product-header";
import { StartProjectForm } from "@/components/workspace/start-project-form";
import {
  Band,
  BandLink,
  ProductFacts,
  CurrentWork,
  WorkEntry,
  ProductJourney,
} from "@/components/workspace/workspace-sections";
import { getWorkspaceSnapshot, getBuildLog, getArtifacts } from "@/lib/workspace/queries";
import { getCurriculum } from "@/lib/learning/queries";
import { getProgressSnapshot } from "@/lib/progress/queries";

export const metadata: Metadata = { title: "My SaaS" };

/**
 * The product workspace.
 *
 * Two states, and they are different pages rather than one page with things
 * hidden. Before a product exists this is a setup step; after, it is the place
 * the learner comes back to. Nothing is drawn empty in between — a workspace of
 * blank cards is a list of things you have failed to do.
 *
 * The populated state answers the six questions in the order somebody asks
 * them: what am I building (the masthead), what is it (the facts), what do I do
 * now (current work, and the only accent on the page), where is my work
 * (artifacts, build log), how far have I come (the journey).
 *
 * What this page deliberately does *not* do is restate LOCK. There is no
 * roadmap, no lesson list, no toolbox and no achievement wall — the artifact
 * list and the build log are doors with counts on them, not contents. This is
 * the product's page; the programme lives elsewhere.
 */
export default async function WorkspacePage() {
  const snapshot = await getWorkspaceSnapshot();

  /* ── State A: nothing exists yet ─────────────────────────────────────── */
  if (!snapshot.project) {
    return (
      <div className="space-y-10">
        <header className="space-y-2">
          <p className="label text-ink-subtle">My SaaS</p>
          <h1 className="text-title">Your product workspace</h1>
          <p className="max-w-measure text-[0.9375rem] leading-relaxed text-ink-muted">
            LOCK carries one product through the whole programme. Name it, and
            every mission from here applies to something real.
          </p>
        </header>

        {/*
         * The form on the left, what happens next on the right. A single
         * centred form on an empty page reads as an interruption; putting the
         * consequence beside it makes it a step in a process. The column
         * collapses under the form on anything narrower than `lg`, so on a
         * phone the first thing on screen is still the name field.
         */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-14">
          <Band title="What are you building?">
            <StartProjectForm />
          </Band>

          <div className="lg:pt-0">
            <Band title="What this sets up">
              <ol className="divide-y divide-border">
                {[
                  {
                    n: "01",
                    t: "Missions attach to it",
                    d: "Every mission produces a deliverable for this product rather than an exercise.",
                  },
                  {
                    n: "02",
                    t: "Artifacts collect here",
                    d: "What you produce is kept, reviewed by your mentor, and kept again.",
                  },
                  {
                    n: "03",
                    t: "The build log writes itself",
                    d: "Submissions, reviews and completions are recorded as they happen.",
                  },
                ].map((step) => (
                  <li key={step.n} className="flex gap-4 py-3 first:pt-0">
                    <span className="label pt-0.5 tabular-nums text-ink-subtle">{step.n}</span>
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-medium text-ink">{step.t}</span>
                      <span className="block max-w-measure text-sm leading-relaxed text-ink-muted">
                        {step.d}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Band>
          </div>
        </div>
      </div>
    );
  }

  /* ── State B: the workspace ──────────────────────────────────────────── */
  const [curriculum, log, artifacts, progress] = await Promise.all([
    getCurriculum(),
    getBuildLog(),
    getArtifacts(),
    getProgressSnapshot(),
  ]);

  const phaseLabel =
    curriculum.find((entry) => entry.phase.key === snapshot.project?.current_phase)?.phase.label ??
    null;

  return (
    <div className="space-y-10">
      <ProductHeader
        project={snapshot.project}
        phaseLabel={phaseLabel}
        missionsDone={snapshot.completedCount}
        missionsTotal={snapshot.totalCount}
        artifactCount={artifacts.length}
      />

      <Band title="Current work">
        {snapshot.current ? (
          <CurrentWork current={snapshot.current} next={snapshot.next} />
        ) : (
          <EmptyState title="Nothing open">
            <p>
              Missions appear here as the curriculum is published. Each one
              applies a lesson to this product and leaves an artifact behind.
            </p>
          </EmptyState>
        )}
      </Band>

      <Band title="Your product">
        <ProductFacts project={snapshot.project} />
      </Band>

      <Band title="Project work">
        <div className="grid gap-3 sm:grid-cols-2">
          <WorkEntry
            href="/build/artifacts"
            title="Artifacts"
            count={artifacts.length}
            unit={artifacts.length === 1 ? "produced" : "produced"}
            detail="What each mission produced, and its review."
          />
          <WorkEntry
            href="/build/log"
            title="Build log"
            count={log.length}
            unit={log.length === 1 ? "entry" : "entries"}
            detail="What you decided, when, and why."
          />
        </div>

        {/*
         * Three recent lines, as orientation. Not the log — the log is one
         * click away and this page is not it.
         */}
        {log.length > 0 ? (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {log.slice(0, 3).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
                <span className="label shrink-0 tabular-nums text-ink-subtle">
                  {new Date(entry.occurred_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </span>
                <span className="min-w-0 text-sm text-ink-muted">{entry.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Band>

      <Band title="Product journey" action={<BandLink href="/progress">Full progress</BandLink>}>
        <Card className="p-5">
          <ProductJourney
            percent={progress.overall?.percent ?? null}
            missionsDone={snapshot.completedCount}
            missionsTotal={snapshot.totalCount}
          />
        </Card>
      </Band>
    </div>
  );
}
