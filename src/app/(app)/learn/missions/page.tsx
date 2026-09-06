import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getLearningOverview } from "@/lib/learning/overview";
import { getProject } from "@/lib/workspace/queries";
import { MISSION_STATUS_LABEL, MISSION_TYPE_LABEL } from "@/lib/workspace/labels";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Missions" };

/**
 * Where learning turns into something that exists.
 *
 * Missions were a list of bordered rows with three small badges each, which
 * made the most consequential thing in LOCK look like a settings table. They
 * are numbered now — `01.02` reads as position in a programme rather than as a
 * row in a list — grouped under their phase, and each one leads with what it
 * produces, because the deliverable is the point.
 */
export default async function MissionsPage() {
  const [overview, project] = await Promise.all([getLearningOverview(), getProject()]);
  const phasesWithMissions = overview.phases.filter((p) => p.missions.length > 0);
  const total = overview.phases.reduce((t, p) => t + p.missions.length, 0);
  const done = overview.phases.reduce((t, p) => t + p.missionsDone, 0);

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="label text-ink-subtle">Learn</p>
        <h1 className="text-display max-w-measure text-balance">Missions</h1>
        <p className="max-w-measure text-lede text-ink-muted">
          Learn, then do. Each mission is a piece of founder work that produces
          an artifact for your product and goes to your mentor for review.
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
            <ButtonLink href="/learn" size="sm">See the roadmap</ButtonLink>
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
