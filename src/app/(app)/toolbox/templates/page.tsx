import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <SectionPlaceholder href="/toolbox/templates">
      <p>Documents you fill in rather than invent: positioning, specs, test plans, launch checklists.</p>
    </SectionPlaceholder>
  );
}
