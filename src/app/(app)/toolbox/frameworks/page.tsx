import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Frameworks" };

export default function FrameworksPage() {
  return (
    <SectionPlaceholder href="/toolbox/frameworks">
      <p>Ways of thinking that hold up under pressure — how to size a market, cut a scope, price a plan.</p>
    </SectionPlaceholder>
  );
}
