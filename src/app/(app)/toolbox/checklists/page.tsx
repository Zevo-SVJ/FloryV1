import type { Metadata } from "next";
import { ToolboxCategory } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Checklists" };

export default function Page() {
  return (
    <ToolboxCategory
      kind="checklist"
      eyebrow="Toolbox"
      title="Checklists"
      description="What to verify before you call something done. A safety tool, never evidence."
    />
  );
}
