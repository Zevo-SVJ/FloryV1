import { Badge } from "@/components/ui/surface";
import { PROJECT_STATUS_LABEL } from "@/lib/workspace/labels";
import type { ProjectRow } from "@/types/database";

/**
 * The product, as the page's subject.
 *
 * A masthead rather than a card, and the distinction is the whole redesign:
 * a card says "here is a record about your project", a masthead says "this page
 * is your project". The name is the largest thing on the screen and the only
 * thing at that size.
 *
 * The metadata sits on one rule beneath it — status, phase, what has been
 * produced — in the compact monospace label the rest of LOCK uses for facts.
 * Reading it takes a second and answers "what is this and where is it up to",
 * which is the question the brief puts first.
 */
export function ProductHeader({
  project,
  phaseLabel,
  missionsDone,
  missionsTotal,
  artifactCount,
}: {
  project: ProjectRow;
  phaseLabel: string | null;
  missionsDone: number;
  missionsTotal: number;
  artifactCount: number;
}) {
  return (
    <header className="space-y-5">
      <div className="space-y-2">
        <p className="label text-ink-subtle">My SaaS</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* `text-balance` so a long product name breaks sensibly rather than
              leaving one orphaned word on the second line. */}
          <h1 className="text-title text-balance">{project.name}</h1>
          <Badge tone={project.status === "live" ? "accent" : "quiet"}>
            {PROJECT_STATUS_LABEL[project.status]}
          </Badge>
        </div>

        {project.description ? (
          <p className="max-w-measure text-[0.9375rem] leading-relaxed text-ink-muted">
            {project.description}
          </p>
        ) : null}
      </div>

      {/*
       * A rule with facts on it.
       *
       * The dividers only exist from `sm` up, where all three facts fit on one
       * line. Below that the row wraps, and any per-item left border leaves a
       * stray divider hanging at the start of the second line — `first:` clears
       * the first item overall, not the first of each wrapped line, and there
       * is no CSS selector for the latter. On a phone the gap does the
       * separating instead, which is what a wrapped row wants anyway.
       */}
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border py-3 sm:gap-x-0">
        <Fact label="Phase">{phaseLabel ?? "Not started"}</Fact>
        <Fact label="Missions">
          <span className="tabular-nums">
            {missionsDone}/{missionsTotal}
          </span>
        </Fact>
        <Fact label="Artifacts">
          <span className="tabular-nums">{artifactCount}</span>
        </Fact>
      </dl>
    </header>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 sm:border-l sm:border-border sm:pr-5 sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
      <dt className="label text-ink-subtle">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}
