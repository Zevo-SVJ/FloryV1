import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Build Log" };

export default function BuildLogPage() {
  return (
    <SectionPlaceholder href="/build/log">
      <p>A dated record of what you decided and why. Founders forget their own reasoning within a month; this is where it stays.</p>
    </SectionPlaceholder>
  );
}
