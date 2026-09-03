import type { Metadata } from "next";
import { Editor } from "@/components/editor/editor";
import { getEditorDraft } from "@/lib/editor/load";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

/**
 * The editor route.
 *
 * A thin server shell: it loads the page the creator already has and hands it
 * to a Client Component, which owns everything from there. Loading on the
 * server rather than fetching after mount means the editor arrives with the
 * page in it — no spinner, no flash of an empty list on a page that turns out
 * to have twelve blocks.
 *
 * `getEditorDraft` calls `requireClaimedProfile()`, so protection is not this
 * file's job and cannot be forgotten here. The `(app)` layout checks the same
 * thing again, and Row Level Security is what holds if both were bypassed.
 */
export default async function EditorPage() {
  const draft = await getEditorDraft();

  return <Editor initial={draft} />;
}
