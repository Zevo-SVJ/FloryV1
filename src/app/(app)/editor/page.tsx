import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

/**
 * The editor route.
 *
 * A protected placeholder. The editor itself is phase 4; this exists now so the
 * route, its protection and its place in the shell are settled before anything
 * is built on top of them.
 */
export default async function EditorPage() {
  const profile = await requireProfile();

  return (
    <div className="max-w-2xl">
      <h1 className="text-title">Editor</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This is where you will build{" "}
        <span className="font-mono text-ink">showme.at/{profile.username}</span>.
      </p>
      <p className="mt-6 rounded-card border border-border bg-surface-sunken px-4 py-3.5 text-sm text-ink-muted">
        Nothing to edit yet. The route is protected and the schema behind it —
        links, socials and blocks — is in place.
      </p>
    </div>
  );
}
