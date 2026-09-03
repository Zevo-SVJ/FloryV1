import { SectionTitle } from "@/components/public/section-title";
import type { LinksBlockData } from "@/lib/blocks/schemas";
import type { PublicLink } from "@/lib/public-page/types";

/**
 * What the creator is pointing at.
 *
 * The reason the page exists, so it gets the most weight on it. Every button
 * here is `.sm-button`, the one button in the product: its fill, its border,
 * its radius and its height are the creator's design, and this component
 * decides none of them. That is what stops a gallery's call to action from
 * quietly diverging from a link.
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

      <ul className="sm-links">
        {links.map((link) => (
          <li key={link.id}>
            {/*
              * `/go/<id>` rather than the destination itself. The click is the
              * request, so it cannot be lost to a navigation that starts
              * before a beacon leaves — which on a slow phone is a large share
              * of them. The destination is never in this URL: it is looked up
              * from the row, so there is no parameter to override and no open
              * redirect to find.
              */}
            <a href={`/go/${link.id}`} rel="nofollow ugc noopener" className="sm-button">
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
