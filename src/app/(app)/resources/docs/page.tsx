import type { Metadata } from "next";
import { ToolboxCategory, RESOURCE_VIEWS } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Docs" };

/**
 * A view onto the one Toolbox library, narrowed to one sort of resource.
 *
 * Not a second table and not a second navigation config: resources live in
 * `toolbox_items` with everything else, which is what lets one search cover
 * them and one save button work everywhere.
 */
export default function Page() {
  return (
    <ToolboxCategory
      kind="resource"
      resourceKind="doc"
      eyebrow="Resources"
      title="Docs"
      description="Documentation for the tools you actually use, so you are not searching for it mid-build."
      views={RESOURCE_VIEWS}
      activeView="/resources/docs"
    />
  );
}
