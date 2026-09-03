import { SectionTitle } from "@/components/public/section-title";
import type { LinksBlockData } from "@/lib/blocks/schemas";
import type { PublicLink } from "@/lib/public-page/types";

/**
 * What the creator is pointing at.
 *
 * The reason the page exists, so it gets the most weight on it. Full-width
 * targets, 56px tall — comfortably above the 44px minimum a thumb needs, and
 * the same on every screen size, because this page is read on a phone far more
 * often than anywhere else.
 *
 * Links open in the same tab. A ShowMe page is a launcher, not a destination:
 * same-tab navigation keeps the back button meaningful, and new tabs behave
 * badly inside the in-app browsers these links are usually opened from.
 *
 * `rel` carries three things that matter. `nofollow ugc` stops ShowMe from
 * becoming a link farm — without it, signing up to place a backlink is a
 * strategy. `noopener` is defensive: it costs nothing and holds if a link ever
 * does open in a new context.
 *
 * A page may hold several of these. `aria-label` falls back to a generic name
 * when the section is untitled, so two unlabelled navs are still
 * distinguishable to a screen reader by their contents rather than colliding
 * under one identical name.
 */
export function LinksBlock({ data, links }: { data: LinksBlockData; links: PublicLink[] }) {
  const title = data.title.trim();

  return (
    <nav aria-label={title.length > 0 ? title : "Links"}>
      <SectionTitle>{data.title}</SectionTitle>

      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              rel="nofollow ugc noopener"
              className="flex min-h-14 items-center justify-center rounded-card border border-border bg-surface px-5 py-4 text-center text-[0.9375rem] leading-snug font-medium shadow-control transition-colors hover:border-border-strong hover:bg-surface-sunken"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
