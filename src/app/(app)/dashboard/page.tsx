import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/dal";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The dashboard.
 *
 * Deliberately thin. It confirms the session resolved, shows the address the
 * page will live at, and points at the editor. Everything a dashboard will
 * eventually hold — analytics, plan, page state — belongs to later phases.
 */
export default async function DashboardPage() {
  const profile = await requireProfile();

  return (
    <div className="max-w-2xl">
      <h1 className="text-title">
        {profile.display_name ? `Hello, ${profile.display_name}` : "Your page"}
      </h1>

      <p className="mt-2 text-sm text-ink-muted">
        Signed in. Your page is reserved at the address below.
      </p>

      <dl className="mt-8 divide-y divide-border rounded-card border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-sm text-ink-muted">Address</dt>
          <dd className="font-mono text-sm">showme.at/{profile.username}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-sm text-ink-muted">Username</dt>
          <dd className="text-sm">{profile.username}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <dt className="text-sm text-ink-muted">Created</dt>
          <dd className="text-sm">
            {new Date(profile.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/editor" size="sm">
          Open editor
        </ButtonLink>
        <ButtonLink href={`/${profile.username}`} size="sm" variant="secondary">
          View public page
        </ButtonLink>
      </div>
    </div>
  );
}
