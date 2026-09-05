import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Stack" };

export default function StackPage() {
  return (
    <SectionPlaceholder href="/toolbox/stack">
      <p>The tools you build with, and — more useful — when each one earns its place and when it does not.</p>
    </SectionPlaceholder>
  );
}
