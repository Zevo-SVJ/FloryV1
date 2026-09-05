import type { Metadata } from "next";
import { ToolboxCategory } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "References" };

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
      resourceKind="reference"
      eyebrow="Resources"
      title="References"
      description="Books, articles and material worth coming back to after the phase is over."
    />
  );
}
