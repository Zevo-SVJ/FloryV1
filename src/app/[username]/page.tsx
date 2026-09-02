import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicPage } from "@/lib/profiles";
import { normalizeUsername, usernameFromPath } from "@/lib/validation/username";

/**
 * The public creator page — showme.at/<username>.
 *
 * This is the route that matters most. It is opened from a TikTok bio on a
 * phone by someone who will give it about a second, so it is a Server
 * Component with no client JavaScript at all: the HTML that arrives is the
 * finished page.
 *
 * The rendering is a placeholder — the real page engine is phase 3. What is
 * settled here is the shape: the URL contract, the canonical redirect, the
 * 404, and dynamic metadata.
 */

interface PageProps {
  params: Promise<{ username: string }>;
}

/**
 * One page, one address.
 *
 * `/Alex` and `/alex` must not both render. Anything that is not already
 * canonical is redirected to the form that is, so links, analytics and search
 * results never fragment across spellings.
 */
async function resolveUsername(params: PageProps["params"]): Promise<string> {
  const { username: raw } = await params;
  const canonical = usernameFromPath(raw);
  if (canonical) return canonical;

  const normalized = normalizeUsername(decodeURIComponent(raw));
  if (normalized.length > 0 && normalized !== raw) redirect(`/${normalized}`);

  notFound();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const username = await resolveUsername(params);
  const page = await getPublicPage(username);

  if (!page) {
    return { title: "Page not found", robots: { index: false, follow: false } };
  }

  const { profile } = page;
  const title = profile.display_name ?? profile.username;
  const description = profile.bio ?? `${title} on ShowMe.`;
  const url = `/${profile.username}`;

  /*
   * `openGraph.images` is left unset until phase 8 gives each page a generated
   * preview image. Naming a file that does not exist would be worse than
   * omitting it: platforms cache a broken preview for days.
   */
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title,
      description,
      url,
      siteName: "ShowMe",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const username = await resolveUsername(params);
  const page = await getPublicPage(username);

  if (!page) notFound();

  const { profile, links } = page;
  const name = profile.display_name ?? profile.username;

  return (
    <main className="container-profile flex min-h-dvh flex-col items-center py-16 text-center">
      <div
        aria-hidden
        className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-sunken text-xl font-semibold text-ink-subtle"
      >
        {name.slice(0, 1).toUpperCase()}
      </div>

      <h1 className="mt-5 text-title">{name}</h1>
      <p className="mt-1 font-mono text-sm text-ink-subtle">@{profile.username}</p>

      {profile.bio ? (
        <p className="mt-4 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
          {profile.bio}
        </p>
      ) : null}

      {links.length > 0 ? (
        <ul className="mt-9 w-full space-y-3">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                rel="noopener noreferrer nofollow ugc"
                target="_blank"
                className="block rounded-card border border-border bg-surface px-5 py-4 text-[0.9375rem] font-medium shadow-control transition-colors hover:border-border-strong"
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-9 text-sm text-ink-subtle">This page is still being built.</p>
      )}
    </main>
  );
}
