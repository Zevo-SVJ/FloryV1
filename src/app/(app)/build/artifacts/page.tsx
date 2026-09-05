import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Artifacts" };

export default function ArtifactsPage() {
  return (
    <SectionPlaceholder href="/build/artifacts">
      <p>Every mission produces something real — a positioning statement, a schema, a landing page, a deployed build. Those artifacts collect here as the record of your product.</p>
    </SectionPlaceholder>
  );
}
