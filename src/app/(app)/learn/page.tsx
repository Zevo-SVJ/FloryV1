import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Roadmap, RoadmapLegend } from "@/components/lock/roadmap";
import { buildRoadmap } from "@/lib/lock/roadmap";
import { PHASES } from "@/lib/lock/phases";

export const metadata: Metadata = { title: "Roadmap" };

/**
 * The roadmap.
 *
 * A real page, not a placeholder: the ten phases are the program, they are
 * fixed, and seeing the whole route before starting it is most of what a
 * roadmap is for. What is missing is where *you* are on it.
 *
 * `buildRoadmap(null)` is what says so. Prompt 3 replaces that one argument
 * with progress read from Supabase and nothing else on this page changes — not
 * the component, not the layout, not the state vocabulary. That is the point of
 * building the roadmap before the learning engine rather than with it.
 */
export default function RoadmapPage() {
  const phases = buildRoadmap(null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learn"
        title="The roadmap"
        description="Ten phases, from an idea to a product people pay for. You do them in order, because each one is the input to the next."
        meta={
          <>
            <HeaderMeta label="Phases">{PHASES.length}</HeaderMeta>
            <HeaderMeta label="Your position">Not tracked yet</HeaderMeta>
          </>
        }
      />

      <RoadmapLegend />

      <section aria-label="Phases">
        <Roadmap phases={phases} />
      </section>

      <p className="max-w-measure border-l-2 border-border py-1 pl-4 text-sm text-ink-muted">
        Every phase reads as <span className="text-ink">Next up</span> because
        nothing is recorded yet. Progress starts being tracked when the lessons
        and missions land in Prompt 3 — until then the roadmap shows the route,
        not your position on it.
      </p>
    </div>
  );
}
