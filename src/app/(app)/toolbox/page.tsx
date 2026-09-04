import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";
import { requireSection } from "@/lib/lock/navigation";

export const metadata: Metadata = { title: "Toolbox" };

/**
 * The route exists so the section has a home, a URL and a place in the
 * navigation. What it renders is the truth: this is not built yet. See
 * `lib/lock/navigation.ts` for which prompt fills it in.
 */
export default function ToolboxPage() {
  return <SectionPlaceholder section={requireSection("/toolbox")} />;
}
