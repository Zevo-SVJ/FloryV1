import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Your Mentor" };

export default function MentorPage() {
  return (
    <SectionPlaceholder href="/mentor">
      <p>Send a mission for review and read what came back. Zevo reviews the work you submit — the queue, the feedback and the conversation live here.</p>
    </SectionPlaceholder>
  );
}
