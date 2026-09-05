import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Badge, Card } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { getMissions, getProject } from "@/lib/workspace/queries";
import { MISSION_STATUS_LABEL, MISSION_TYPE_LABEL } from "@/lib/workspace/labels";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Missions" };

/**
 * Every mission, and what you have done about it.
 *
 * A mission is not a lesson with homework attached — it is a piece of founder
 * work that produces something, and the list says so by leading with the
 * deliverable rather than with a lesson reference.
 */
export default async function MissionsPage() {
  const [missions, project] = await Promise.all([getMissions(), getProject()]);
  const done = missions.filter((entry) => entry.progress?.status === "completed").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learn"
        title="Missions"
        description="The work that turns a lesson into something you have actually built. Each one produces an artifact for your SaaS."
        meta={
          <>
            <HeaderMeta label="Published">{missions.length}</HeaderMeta>
            <HeaderMeta label="Completed">{done}</HeaderMeta>
          </>
        }
        action={
          project ? undefined : (
            <ButtonLink href="/build" size="sm">
              Start your SaaS
            </ButtonLink>
          )
        }
      />

      {!project ? (
        <p className="max-w-measure border-l-2 border-accent py-1 pl-4 text-sm text-ink-muted">
          Missions apply to a product. Name yours in My SaaS first — everything
          you produce here attaches to it.
        </p>
      ) : null}

      {missions.length === 0 ? (
        <EmptyState title="No missions published yet">
          <p>
            The engine is built; the missions themselves are written with the
            curriculum so the work is designed rather than improvised around the
            software.
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {missions.map(({ mission, progress, artifact }) => {
            const status = progress?.status ?? "not_started";
            const complete = status === "completed";

            return (
              <li key={mission.id}>
                <Link
                  href={`/learn/missions/${mission.slug}`}
                  className="block rounded-card border border-border p-5 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        complete ? "bg-success" : "bg-border-strong",
                      )}
                    />
                    <span className="text-[0.9375rem] font-medium text-ink">{mission.title}</span>
                    <span className="label text-ink-subtle">
                      {MISSION_TYPE_LABEL[mission.type]}
                    </span>
                    <span className="label text-ink-subtle tabular-nums">
                      {mission.estimated_minutes} min
                    </span>
                    <Badge tone={complete ? "accent" : "quiet"}>
                      {MISSION_STATUS_LABEL[status]}
                    </Badge>
                    {mission.is_demo ? <Badge>Demo</Badge> : null}
                  </div>

                  <p className="mt-2 max-w-measure text-sm text-ink-muted">{mission.objective}</p>

                  <p className="mt-3 text-sm text-ink-subtle">
                    <span className="label mr-2">Produces</span>
                    {mission.deliverable_title}
                    {artifact ? " · started" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="border-dashed bg-transparent p-4">
        <p className="text-sm text-ink-subtle">
          Missions marked <span className="text-ink">Demo</span> exist to prove
          the work layer runs end to end, and are removed when the curriculum
          lands.
        </p>
      </Card>
    </div>
  );
}
