import type { Metadata } from "next";
import { requireClaimedProfile, getUser } from "@/lib/auth/dal";
import { ButtonLink } from "@/components/ui/button";
import { CopyAddress } from "@/components/dashboard/copy-address";
import { ShareButton } from "@/components/share/share-button";
import { renderableMediaUrl } from "@/lib/media/url";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * The account home.
 *
 * One job in this phase: make it obvious that the account is now connected to
 * an address, and give the person a way to copy it. Everything a dashboard
 * will eventually hold — the editor, views, plan — belongs to later phases,
 * and inventing a number here would be worse than leaving the space empty.
 */
export default async function DashboardPage() {
  const [profile, user] = await Promise.all([requireClaimedProfile(), getUser()]);

  const origin = siteUrl().replace(/^https?:\/\//, "");
  const address = `${origin}/${profile.username}`;

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-ink-muted">
        {profile.display_name ? `Hello, ${profile.display_name}` : "Your ShowMe page"}
      </p>

      <h1 className="mt-2 font-mono text-title break-all">{address}</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/*
          * Share first, copy second. Sharing is the action this whole phase
          * exists to make easy, and the sheet behind it contains the copy
          * button anyway — but a creator who only ever wants the link on
          * their clipboard should not have to open a dialog for it.
          */}
        <ShareButton
          url={`${siteUrl()}/${profile.username}`}
          address={address}
          profile={{
            displayName: profile.display_name,
            username: profile.username,
            avatarUrl: renderableMediaUrl(profile.avatar_url),
          }}
        />
        <CopyAddress url={`${siteUrl()}/${profile.username}`} />
        <ButtonLink href={`/${profile.username}`} size="sm" variant="secondary">
          View page
        </ButtonLink>
        <ButtonLink href="/editor" size="sm" variant="ghost">
          Editor
        </ButtonLink>
        <ButtonLink href="/dashboard/analytics" size="sm" variant="ghost">
          Analytics
        </ButtonLink>
        <ButtonLink href="/dashboard/optimize" size="sm" variant="ghost">
          Optimize
        </ButtonLink>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-ink">Account</h2>
        <dl className="mt-3 divide-y divide-border rounded-card border border-border bg-surface text-sm">
          <Row label="Username">{profile.username}</Row>
          <Row label="Display name">
            {profile.display_name ?? <Unset>Not set yet</Unset>}
          </Row>
          <Row label="Bio">{profile.bio ?? <Unset>Not set yet</Unset>}</Row>
          <Row label="Email">{user?.email ?? <Unset>Unknown</Unset>}</Row>
          <Row label="Joined">
            {new Date(profile.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Row>
        </dl>
        <p className="mt-3 text-sm text-ink-subtle">
          Your display name, bio and page design are all set in the editor.
        </p>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-4 py-3.5">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

const Unset = ({ children }: { children: React.ReactNode }) => (
  <span className="text-ink-subtle">{children}</span>
);
