import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { ProjectSnapshot } from "@/components/workspace/project-snapshot";
import { StartProjectForm } from "@/components/workspace/start-project-form";
import { getWorkspaceSnapshot, getBuildLog } from "@/lib/workspace/queries";
import { getCurriculum } from "@/lib/learning/queries";
import { MISSION_TYPE_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "My SaaS" };

/**
 * The workspace.
 *
 * Written in the second person and about the product, not the programme. "Your
 * SaaS has no name yet" is a different sentence from "no records found", and
 * the difference is the whole positioning: this is where somebody's company
 * starts, not a module they are working through.
 *
 * Before a project exists there is exactly one thing on the page — the form
 * that starts it. No dashboard of empty cards, because a dashboard of empty
 * cards is a list of things you have failed to do.
 */
export default async function WorkspacePage() {
  const snapshot = await getWorkspaceSnapshot();

  if (!snapshot.project) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="My SaaS"
          title="Your SaaS journey"
          description="Everything you build in LOCK belongs to one product. Name it, and the missions start applying to something real."
        />
        <StartProjectForm />
      </div>
    );
  }

  const [curriculum, log] = await Promise.all([getCurriculum(), getBuildLog()]);
  const phaseLabel =
    curriculum.find((entry) => entry.phase.key === snapshot.project?.current_phase)?.phase.label ??
    null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My SaaS"
        title={snapshot.project.name}
        description={snapshot.project.description || "Give it a line once you know what it is."}
        meta={
          <>
            <HeaderMeta label="Missions done">
              {snapshot.completedCount} / {snapshot.totalCount}
            </HeaderMeta>
            <HeaderMeta label="Artifacts">
              {snapshot.latestArtifact ? snapshot.latestArtifact.title : "None yet"}
            </HeaderMeta>
          </>
        }
        action={
          <ButtonLink href="/build/artifacts" variant="secondary" size="sm">
            Artifacts
          </ButtonLink>
        }
      />

      <ProjectSnapshot project={snapshot.project} phaseLabel={phaseLabel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <Label as="h2">Current mission</Label>
          {snapshot.current ? (
            <Card className="flex h-full flex-col justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="label text-ink-subtle">
                    {MISSION_TYPE_LABEL[snapshot.current.mission.type]}
                  </span>
                  <span className="label text-ink-subtle tabular-nums">
                    {snapshot.current.mission.estimated_minutes} min
                  </span>
                  {snapshot.current.artifact ? <Badge>Work started</Badge> : null}
                </div>
                <p className="text-[1.0625rem] font-medium text-ink">
                  {snapshot.current.mission.title}
                </p>
                <p className="text-sm text-ink-muted">{snapshot.current.mission.objective}</p>
              </div>
              <div>
                <ButtonLink href={`/learn/missions/${snapshot.current.mission.slug}`} size="sm">
                  Open mission
                </ButtonLink>
              </div>
            </Card>
          ) : (
            <EmptyState title="No mission open" className="h-full">
              <p>
                Missions appear here as the curriculum is published. Each one
                applies a lesson to this product and leaves an artifact behind.
              </p>
            </EmptyState>
          )}
        </section>

        <section className="space-y-3">
          <Label as="h2">Next</Label>
          {snapshot.next ? (
            <Card className="h-full space-y-2 p-5">
              <span className="label text-ink-subtle">
                {MISSION_TYPE_LABEL[snapshot.next.mission.type]}
              </span>
              <p className="text-[1.0625rem] font-medium text-ink">{snapshot.next.mission.title}</p>
              <p className="text-sm text-ink-muted">{snapshot.next.mission.objective}</p>
            </Card>
          ) : (
            <EmptyState title="Nothing queued" className="h-full">
              <p>What comes after the current mission shows here.</p>
            </EmptyState>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Label>Recent activity</Label>
          <Link
            href="/build/log"
            className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink hover:decoration-ink"
          >
            Full build log
          </Link>
        </div>

        {log.length === 0 ? (
          <EmptyState title="Nothing has happened yet">
            <p>
              Submitting a deliverable and completing a mission both write here
              by themselves. You can add your own entries too.
            </p>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {log.slice(0, 4).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-card border border-border p-4"
              >
                <span className="label text-ink-subtle tabular-nums">
                  {new Date(entry.occurred_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </span>
                <span className="text-sm text-ink">{entry.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
