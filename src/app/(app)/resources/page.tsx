import type { Metadata } from "next";
import { ToolboxCategory, RESOURCE_VIEWS } from "@/components/toolbox/category";

export const metadata: Metadata = { title: "Resources" };

/**
 * Every resource, in one place.
 *
 * This used to redirect to `/resources/videos`, because Videos, Docs and
 * References were three separate sidebar destinations. They are one library
 * filtered three ways, and asking a learner to pick the right filter before
 * they can look at anything is exactly the kind of decision the refoundation
 * removes. The narrower views still exist and are one click away.
 */
export default function Page() {
  return (
    <ToolboxCategory
      kind="resource"
      eyebrow="Toolbox"
      title="Resources"
      description="Videos, documentation and references worth coming back to — each with the reason it is here."
      views={RESOURCE_VIEWS}
      activeView="/resources"
    />
  );
}
