import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Lessons" };

export default function LessonsPage() {
  return (
    <SectionPlaceholder href="/learn/lessons">
      <p>Each phase will hold its lessons here — read in order, short enough to act on the same day. The learning engine that stores and sequences them arrives in Prompt 3.</p>
    </SectionPlaceholder>
  );
}
