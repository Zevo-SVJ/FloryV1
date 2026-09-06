import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getLearningOverview } from "@/lib/learning/overview";
import { getProject } from "@/lib/workspace/queries";
import { MISSION_STATUS_LABEL, MISSION_TYPE_LABEL } from "@/lib/workspace/labels";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Missions" };

/**
 * Every mission, for when you are looking for one specific thing.
 *
 * A secondary index, like the lesson index beside it. A mission is the end of a
 * module, and that is where a learner meets it — on the module page and at the
 * bottom of the module's last lesson. A separate "Missions" destination in the
 * sidebar taught the opposite: that missions were their own system you had to
 * remember to visit, rather than the point of the module you were already in.
 *
 * Kept because "which mission produced the idea brief" is a real question.
 */
export default async function MissionsPage() {
  const [overview, project] = await Promise.all([getLearningOverview(), getProject()]);
  const phasesWithMissions = overview.phases.filter((p) => p.missions.length > 0);
  const total = overview.phases.reduce((t, p) => t + p.missions.length, 0);
  const done = overview.phases.reduce((t, p) => t + p.missionsDone, 0);

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/learn" className="label text-ink-subtle transition-colors hover:text-ink">
            Learn
          </Link>
          <span aria-hidden className="label text-border-strong">/</span>
          <span className="label text-ink-muted">Index</span>
        </nav>
        <h1 className="text-display max-w-measure text-balance">Every mission</h1>
        <p className="max-w-measure text-lede text-ink-muted">
          Each mission ends a module: it produces an artifact for your product
          and goes to your mentor for review. You meet them inside the module
          they belong to — this is the complete index.
        </p>
        {total > 0 ? (
          <p className="label pt-1 tabular-nums text-ink-subtle">{done}/{total} complete</p>
        ) : null}
      </header>

      {!project ? (
        <p className="max-w-measure border-l-2 border-accent py-1 pl-4 text-sm leading-relaxed text-ink-muted">
          Missions produce artifacts, and an artifact belongs to a product.{" "}
          <Link href="/build" className="text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink">
            Name yours first
          </Link>
          .
        </p>
      ) : null}

      {total === 0 ? (
        <section className="border-y border-border py-8">
          <p className="label text-ink-subtle">In preparation</p>
          <p className="mt-2 max-w-measure text-lede text-ink-muted">
            No missions are open yet. They are written with the curriculum, so
            the work is designed rather than improvised around the software.
          </p>
          <p className="mt-4">
            <ButtonLink href="/learn" size="sm">Go to Learn</ButtonLink>
          </p>
        </section>
      ) : null}

      {phasesWithMissions.map((phase) => (
        <section key={phase.key} className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
            <h2 className="flex flex-wrap items-baseline gap-x-3">
              <span className="label tabular-nums text-ink-subtle">
                {String(phase.number).padStart(2, "0")}
              </span>
              <span className="text-title">{phase.label}</span>
              {phase.state === "current" ? (
                <span className="label text-accent">You are here</span>
              ) : null}
            </h2>
            <span className="label tabular-nums text-ink-subtle">
              {phase.missionsDone}/{phase.missions.length}
            </span>
          </div>

          <ol className="divide-y divide-border">
            {phase.missions.map(({ mission, progress, artifact }, index) => {
              const status = progress?.status ?? "not_started";
              const complete = status === "completed";
              const started = artifact !== null || progress !== null;

              return (
                <li key={mission.id}>
                  <Link
                    href={`/learn/missions/${mission.slug}`}
                    className="-mx-3 flex gap-4 rounded-control px-3 py-5 transition-colors hover:bg-surface-sunken sm:gap-6"
                  >
                    {/* The mission's address in the programme. */}
                    <span
                      className={cn(
                        "label shrink-0 pt-1 tabular-nums",
                        complete ? "text-ink-subtle" : "text-accent",
                      )}
                    >
                      {String(phase.number).padStart(2, "0")}.{String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span
                          className={cn(
                            "text-[1.0625rem] leading-snug font-medium tracking-tight",
                            complete ? "text-ink-muted" : "text-ink",
                          )}
                        >
                          {mission.title}
                        </span>
                        <span className="label text-ink-subtle">
                          {MISSION_STATUS_LABEL[status]}
                        </span>
                        {mission.is_demo ? (
                          <span className="label text-ink-subtle">Demo</span>
                        ) : null}
                      </span>

                      <span className="block max-w-measure text-sm leading-relaxed text-ink-muted">
                        {mission.objective}
                      </span>

                      <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1">
                        <span className="label text-ink-subtle">
                          Produces{" "}
                          <span className="text-ink-muted">{mission.deliverable_title}</span>
                        </span>
                        <span className="label text-ink-subtle">
                          {MISSION_TYPE_LABEL[mission.type]}
                        </span>
                        <span className="label tabular-nums text-ink-subtle">
                          {mission.estimated_minutes} min
                        </span>
                        {started && !complete ? (
                          <span className="label text-accent">Started</span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
