import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Prompts" };

export default function PromptsPage() {
  return (
    <SectionPlaceholder href="/toolbox/prompts">
      <p>The prompts worth keeping — the ones that reliably get good work out of an execution layer, for the jobs that come round again.</p>
    </SectionPlaceholder>
  );
}
