import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <SectionPlaceholder href="/learn/missions">
      <p>A mission is the work that turns a lesson into something you have actually built. They will appear here with what each one asks for and what it produces.</p>
    </SectionPlaceholder>
  );
}
