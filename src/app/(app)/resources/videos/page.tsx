import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Videos" };

export default function VideosPage() {
  return (
    <SectionPlaceholder href="/resources/videos">
      <p>Walkthroughs worth watching once, attached to the phase they belong to.</p>
    </SectionPlaceholder>
  );
}
