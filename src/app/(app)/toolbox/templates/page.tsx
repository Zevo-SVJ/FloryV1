import type { Metadata } from "next";
import { ToolboxCategory } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Templates" };

export default function Page() {
  return (
    <ToolboxCategory
      kind="template"
      eyebrow="Toolbox"
      title="Templates"
      description="Documents you fill in rather than invent. Completing one in a mission is how an artifact gets produced."
    />
  );
}
