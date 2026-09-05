import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Badge, Card } from "@/components/ui/surface";
import { ButtonLink } from "@/components/ui/button";
import { getArtifacts } from "@/lib/workspace/queries";
import { ARTIFACT_STATUS_LABEL, EVIDENCE_KIND_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Artifacts" };

/**
 * The project archive.
 *
 * Numbered, because the sequence is the story: an Idea Brief, then Market
 * Research, then a Validation Report. Read top to bottom it is a record of a
 * product being built, which is the thing LOCK exists to produce and the thing
 * a learner can show somebody afterwards.
 */
export default async function ArtifactsPage() {
  const artifacts = await getArtifacts();
  const submitted = artifacts.filter(({ artifact }) => artifact.status !== "draft").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My SaaS"
        title="Artifacts"
        description="Everything you have produced, in the order you produced it. This is the evidence your product exists."
        meta={
          <>
            <HeaderMeta label="Total">{artifacts.length}</HeaderMeta>
            <HeaderMeta label="Submitted">{submitted}</HeaderMeta>
          </>
        }
      />

      {artifacts.length === 0 ? (
        <EmptyState title="Nothing produced yet">
          <p>
            Every mission produces something real — a brief, a research
            document, a deployed build. They collect here as you finish them.
          </p>
          <p className="pt-3">
            <ButtonLink href="/learn/missions" variant="secondary" size="sm">
              See the missions
            </ButtonLink>
          </p>
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {[...artifacts].reverse().map(({ artifact, mission, evidence }, index) => (
            <li key={artifact.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <span className="label text-ink-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.9375rem] font-medium text-ink">{artifact.title}</span>
                  <Badge tone={artifact.status === "draft" ? "quiet" : "accent"}>
                    {ARTIFACT_STATUS_LABEL[artifact.status]}
                  </Badge>
                  <span className="label text-ink-subtle tabular-nums">
                    {new Date(artifact.updated_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>

                {mission ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    <span className="label mr-2 text-ink-subtle">Mission</span>
                    {mission.title}
                  </p>
                ) : null}

                {artifact.url ? (
                  <p className="mt-2">
                    <a
                      href={artifact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm break-all text-ink underline decoration-border-strong underline-offset-4"
                    >
                      {artifact.url}
                    </a>
                  </p>
                ) : null}

                {evidence.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {evidence.map((row) => (
                      <li key={row.id}>
                        {row.url ? (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="label inline-flex rounded-full border border-border px-2.5 py-1 text-ink-muted hover:border-border-strong hover:text-ink"
                          >
                            {EVIDENCE_KIND_LABEL[row.kind]}
                          </a>
                        ) : (
                          <span className="label inline-flex rounded-full border border-border px-2.5 py-1 text-ink-subtle">
                            {EVIDENCE_KIND_LABEL[row.kind]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
