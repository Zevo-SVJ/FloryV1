import type { Metadata } from "next";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/states/empty-state";
import { Badge } from "@/components/ui/surface";
import { BuildLogForm } from "@/components/workspace/build-log-form";
import { getBuildLog, getProject } from "@/lib/workspace/queries";

export const metadata: Metadata = { title: "Build Log" };

/**
 * What happened, and when.
 *
 * Most entries write themselves: submitting a deliverable and completing a
 * mission each insert one, inside the same transaction that made the change, so
 * the record cannot drift from what actually occurred. A log somebody has to
 * remember to write is a log that stops after a week.
 *
 * The learner's own entries sit alongside them, marked differently, because the
 * things worth remembering are rarely only the ones the system noticed — "first
 * user said no" is not an event any database emits.
 */
export default async function BuildLogPage() {
  const [entries, project] = await Promise.all([getBuildLog(), getProject()]);
  const automatic = entries.filter((entry) => entry.is_automatic).length;

  return (
    <Screen
      title="Build log"
      eyebrow="My SaaS"
      lede="What you decided, when, and why. You will not remember your own reasoning in a month."
      back={{ href: "/build", label: "My SaaS" }}
      width="content"
    >
      <div className="space-y-8">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-footnote text-ink-subtle">
          <span>
            <span className="font-mono tabular-nums text-ink">{entries.length}</span> entries
          </span>
          <span>
            <span className="font-mono tabular-nums text-ink">{automatic}</span> recorded automatically
          </span>
        </p>

      {!project ? (
        <EmptyState title="No project yet">
          <p>The build log belongs to a product. Start yours in My SaaS first.</p>
        </EmptyState>
      ) : (
        <>
          <BuildLogForm projectId={project.id} />

          {entries.length === 0 ? (
            <EmptyState title="Nothing logged yet">
              <p>
                Submitting a deliverable and completing a mission both write an
                entry here. Add your own for everything else that mattered.
              </p>
            </EmptyState>
          ) : (
            <ol className="relative space-y-px">
              <span aria-hidden className="absolute top-4 bottom-4 left-[3.75rem] w-px bg-border" />
              {entries.map((entry) => (
                <li key={entry.id} className="relative flex gap-5 py-3">
                  <time
                    dateTime={entry.occurred_at}
                    className="label w-12 shrink-0 pt-1 text-right text-ink-subtle tabular-nums"
                  >
                    {new Date(entry.occurred_at)
                      .toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
                      .toUpperCase()}
                  </time>

                  <span
                    aria-hidden
                    className="relative z-10 mt-2 size-2 shrink-0 rounded-full bg-border-strong ring-4 ring-canvas"
                  />

                  <div className="min-w-0 flex-1 space-y-1 pb-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[0.9375rem] text-ink">{entry.title}</span>
                      {entry.is_automatic ? <Badge>Recorded</Badge> : null}
                    </div>
                    {entry.detail ? (
                      <p className="text-sm text-ink-muted">{entry.detail}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      </div>
    </Screen>
  );
}
