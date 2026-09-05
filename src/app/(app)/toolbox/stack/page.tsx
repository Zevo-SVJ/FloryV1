import type { Metadata } from "next";
import { ToolboxCategory } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Stack" };

export default function Page() {
  return (
    <ToolboxCategory
      kind="stack_tool"
      eyebrow="Toolbox"
      title="Stack"
      description="The tools LOCK builds with, and when each one earns its place. Knowing one tool is not choosing it."
    />
  );
}
