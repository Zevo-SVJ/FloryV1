import { redirect } from "next/navigation";

/**
 * This prefix groups pages; it is not one itself.
 *
 * The sidebar links to the children, so nobody arrives here by clicking. People
 * do arrive by typing, by editing a URL, and from a stale bookmark — and a 404
 * on a path the product plainly owns reads as a broken application. Sending
 * them to the first child costs one file and removes a dead end.
 */
export default function Page() {
  redirect("/toolbox/prompts");
}
