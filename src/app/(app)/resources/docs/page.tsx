import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/states/section-placeholder";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <SectionPlaceholder href="/resources/docs">
      <p>Documentation for the tools you actually use, so you are not searching for it mid-build.</p>
    </SectionPlaceholder>
  );
}
