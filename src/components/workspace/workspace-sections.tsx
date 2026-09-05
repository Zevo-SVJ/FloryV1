import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { MISSION_TYPE_LABEL } from "@/lib/workspace/labels";
import type { MissionSummary } from "@/lib/workspace/queries";
import type { ProjectRow } from "@/types/database";

/**
 * The pieces the workspace is built from.
 *
 * All of them share one idea: a rule and a heading, then content — rather than
 * a page of floating cards. Cards are kept for the two things that are genuinely
 * objects you act on (the current mission, an entry point), and everything else
 * is typography on a divider. That is what makes the page read as dense and
 * calm at the same time; a card around every group is what makes a dashboard.
 */

/** A titled band. The page's only structural element. */
export function Band({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <h2 className="label text-ink-subtle">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The quiet link that sits opposite a band's title. */
export function BandLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
    >
      {children}
    </Link>
  );
}

/**
 * What the product is, as facts rather than prose.
 *
 * A definition list on dividers. Empty fields name the phase that will fill
 * them instead of showing a dash — "not defined yet" plus the reason is a next
 * step, an em dash is a hole.
 */
export function ProductFacts({ project }: { project: ProjectRow }) {
  const rows: { term: string; value: string; pending: boolean }[] = [
    {
      term: "The problem",
      value: project.problem_statement || "Not defined yet — the first missions produce this.",
      pending: !project.problem_statement,
    },
    {
      term: "Who has it",
      value: project.target_audience || "Not defined yet — a person, not a market segment.",
      pending: !project.target_audience,
    },
  ];

  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.term} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[10rem_1fr] sm:gap-6">
          <dt className="label pt-0.5 text-ink-subtle">{row.term}</dt>
          <dd
            className={cn(
              "max-w-measure text-[0.9375rem] leading-relaxed",
              row.pending ? "text-ink-subtle" : "text-ink",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The one thing to do now.
 *
 * The only place on this page that carries the accent, because it is the only
 * place with a primary action. Everything else is orientation.
 */
export function CurrentWork({ current, next }: { current: MissionSummary; next: MissionSummary | null }) {
  const { mission, artifact, progress } = current;
  const started = artifact !== null || progress !== null;

  return (
    <div className="space-y-3">
      <Card className="border-l-2 border-l-accent p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="label text-accent">{MISSION_TYPE_LABEL[mission.type]}</span>
          <span className="label text-ink-subtle tabular-nums">
            {mission.estimated_minutes} min
          </span>
          {started ? <span className="label text-ink-subtle">In progress</span> : null}
        </div>

        <h3 className="mt-2 text-[1.125rem] leading-snug font-medium text-ink">{mission.title}</h3>
        <p className="mt-1.5 max-w-measure text-[0.9375rem] leading-relaxed text-ink-muted">
          {mission.objective}
        </p>

        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <ButtonLink href={`/learn/missions/${mission.slug}`} size="sm">
            {started ? "Continue" : "Open mission"}
          </ButtonLink>
          <span className="text-sm text-ink-subtle">
            Produces <span className="text-ink-muted">{mission.deliverable_title}</span>
          </span>
        </p>
      </Card>

      {next ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-1 text-sm text-ink-subtle">
          <span className="label">Next</span>
          <span className="text-ink-muted">{next.mission.title}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Where the work lives.
 *
 * Entry points, not contents. The brief is explicit that this page must not
 * reproduce the artifact list or the build log, so each of these carries a
 * count and a door and nothing else.
 */
export function WorkEntry({
  href,
  title,
  count,
  unit,
  detail,
}: {
  href: string;
  title: string;
  count: number;
  unit: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-baseline justify-between gap-4 rounded-card border border-border p-4 sm:p-5",
        "transition-colors hover:border-border-strong hover:bg-surface-sunken",
      )}
    >
      <span className="min-w-0 space-y-1">
        <span className="block text-[0.9375rem] font-medium text-ink">{title}</span>
        <span className="block text-sm text-ink-subtle">{detail}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-[1.0625rem] tabular-nums text-ink">{count}</span>
        <span className="label block text-ink-subtle">{unit}</span>
      </span>
    </Link>
  );
}

/**
 * How far the product has come, in one line.
 *
 * A bar and two numbers. The brief asks for orientation rather than another
 * dashboard, and the detail already exists a click away in Progress — so this
 * links there instead of restating it.
 */
export function ProductJourney({
  percent,
  missionsDone,
  missionsTotal,
}: {
  percent: number | null;
  missionsDone: number;
  missionsTotal: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-muted">
          <span className="tabular-nums">{missionsDone}</span> of{" "}
          <span className="tabular-nums">{missionsTotal}</span> missions complete
        </span>
        <span className="font-mono text-sm tabular-nums text-ink">
          {percent === null ? "—" : `${percent}%`}
        </span>
      </div>

      {/* The same bar the rest of LOCK uses, at the same height. `null` renders
          an empty track rather than a zero, which is the honest state before
          any curriculum is published. */}
      <div
        role="progressbar"
        aria-label="Product journey"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(percent === null
          ? { "aria-valuetext": "Not tracked yet" }
          : { "aria-valuenow": percent })}
        className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}
