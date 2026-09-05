import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Checklists" };

export default function ChecklistsPage() {
  return (
    <SectionPlaceholder href="/toolbox/checklists">
      <p>What to verify before you call something done. Shipping is a checklist; so is a schema and so is a pricing page.</p>
    </SectionPlaceholder>
  );
}
