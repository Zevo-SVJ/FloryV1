import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "References" };

export default function ReferencesPage() {
  return (
    <SectionPlaceholder href="/resources/references">
      <p>Material worth coming back to after the phase is over.</p>
    </SectionPlaceholder>
  );
}
