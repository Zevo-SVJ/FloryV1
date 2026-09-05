import type { Metadata } from "next";
import { ToolboxCategory } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Frameworks" };

export default function Page() {
  return (
    <ToolboxCategory
      kind="framework"
      eyebrow="Toolbox"
      title="Frameworks"
      description="Repeatable ways of thinking. Not proprietary terminology — just the orders of operation that hold up under pressure."
    />
  );
}
