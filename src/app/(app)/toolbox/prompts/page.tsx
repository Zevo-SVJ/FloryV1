import type { Metadata } from "next";
import { ToolboxCategory } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Prompts" };

export default function Page() {
  return (
    <ToolboxCategory
      kind="prompt"
      eyebrow="Toolbox"
      title="Prompts"
      description="Reusable instructions for working with an execution layer. Each one defines its context, its constraints and what it should produce."
    />
  );
}
