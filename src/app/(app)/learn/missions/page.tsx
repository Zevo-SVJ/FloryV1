import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow } from "@/components/ui/list";
import { Icon, StatusMark } from "@/components/ui/icon";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getLearningOverview } from "@/lib/learning/overview";
import { getProject } from "@/lib/workspace/queries";
import { MISSION_STATUS_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Every mission" };

/**
 * Every mission, for when you are looking for one specific thing.
 *
 * A secondary index, like the lesson index beside it. A mission is the end of a
 * module, and that is where a learner meets it — on the module screen and at the
 * foot of the module's last lesson. A separate "Missions" destination in the
 * sidebar taught the opposite: that missions were their own system you had to
 * remember to visit, rather than the point of the module you were already in.
 */
export default async function MissionsPage() {
  const [overview, project] = await Promise.all([getLearningOverview(), getProject()]);
  const withMissions = overview.phases.filter((phase) => phase.missions.length > 0);
  const total = overview.totalMissions;

  return (
    <Screen
      title="Every mission"
      eyebrow="Index"
      back={{ href: "/learn", label: "Learn" }}
      width="content"
      lede="Each mission ends a module: it produces an artifact for your product and goes to your mentor for review. You meet them inside the module they belong to — this is the complete index."
    >
      <div className="space-y-8">
        {!project ? (
          <p className="rounded-card bg-accent-quiet/70 px-4 py-3.5 text-subhead text-ink-muted">
            Missions produce artifacts, and an artifact belongs to a product.{" "}
            <Link
              href="/build"
              className="font-medium text-accent underline decoration-accent/40 underline-offset-4"
            >
              Name yours first
            </Link>
            .
          </p>
        ) : null}

        {total === 0 ? (
          <Group>
            <EmptyState
              title="No missions are open yet"
              action={<ButtonLink href="/learn" size="sm">Go to Learn</ButtonLink>}
            >
              They are written with the curriculum, so the work is designed rather
              than improvised around the software.
            </EmptyState>
          </Group>
        ) : null}

        {withMissions.map((phase) => (
          <Group
            key={phase.key}
            title={
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono tabular-nums">
                  {String(phase.number).padStart(2, "0")}
                </span>
                <span>{phase.label}</span>
              </span>
            }
          >
            {phase.missions.map(({ mission, progress }, index) => {
              const status = progress?.status ?? "not_started";
              const done = status === "completed";
              return (
                <LinkRow
                  key={mission.id}
                  href={`/learn/missions/${mission.slug}`}
                  align="start"
                  leading={
                    <StatusMark
                      state={done ? "done" : status === "not_started" ? "todo" : "current"}
                      index={done || status !== "not_started" ? undefined : index + 1}
                    />
                  }
                  title={mission.title}
                  detail={
                    <>
                      {mission.objective}
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-ink-subtle">
                        <span className="flex items-center gap-1.5">
                          <Icon name="note" className="size-3.5" />
                          {mission.deliverable_title}
                        </span>
                        <span className="font-mono tabular-nums">
                          {mission.estimated_minutes} min
                        </span>
                      </span>
                    </>
                  }
                  trailing={
                    <span className="hidden sm:block">{MISSION_STATUS_LABEL[status]}</span>
                  }
                />
              );
            })}
          </Group>
        ))}
      </div>
    </Screen>
  );
}
