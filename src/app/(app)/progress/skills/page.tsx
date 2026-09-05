import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Skills" };

export default function SkillsPage() {
  return (
    <SectionPlaceholder href="/progress/skills">
      <p>Product thinking, research, validation, UX, Claude Code, engineering, testing, deployment, growth. What you can do now that you could not do before, measured by work you produced rather than lessons you opened.</p>
    </SectionPlaceholder>
  );
}
