import { Card, Label, Badge } from "@/components/ui/surface";
import { PROJECT_STATUS_LABEL } from "@/lib/workspace/labels";
import type { ProjectRow } from "@/types/database";

/**
 * "This is your SaaS", in one block.
 *
 * Reusable because it belongs anywhere the learner needs reminding what they
 * are building — the workspace, a mission, later the dashboard. The name is set
 * large and everything else is metadata, which is the hierarchy the whole
 * prompt is about: the product is the subject, the program is the frame.
 *
 * Empty fields say what will fill them rather than showing a placeholder. "Not
 * defined yet — the VALIDATE phase produces this" is a next step; an em dash is
 * a gap.
 */
export function ProjectSnapshot({
  project,
  phaseLabel,
}: {
  project: ProjectRow;
  phaseLabel?: string | null;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Label>Your SaaS</Label>
          <p className="text-title">{project.name}</p>
          {project.description ? (
            <p className="max-w-measure text-sm text-ink-muted">{project.description}</p>
          ) : null}
        </div>
        <Badge tone={project.status === "live" ? "accent" : "quiet"}>
          {PROJECT_STATUS_LABEL[project.status]}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="label text-ink-subtle">Phase</dt>
          <dd className="text-sm text-ink">{phaseLabel ?? "Not started"}</dd>
        </div>
        <div className="space-y-1">
          <dt className="label text-ink-subtle">The problem</dt>
          <dd className="text-sm text-ink-muted">
            {project.problem_statement || "Not defined yet — the first missions produce this."}
          </dd>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <dt className="label text-ink-subtle">Who has it</dt>
          <dd className="text-sm text-ink-muted">
            {project.target_audience || "Not defined yet — a person, not a market segment."}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
