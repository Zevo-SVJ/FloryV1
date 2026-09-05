import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Achievements" };

export default function AchievementsPage() {
  return (
    <SectionPlaceholder href="/progress/achievements">
      <p>Milestones that mark real ground: first validated problem, first deployed build, first paying customer. Not points.</p>
    </SectionPlaceholder>
  );
}
