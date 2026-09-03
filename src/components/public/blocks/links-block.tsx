import Image from "next/image";
import { SectionTitle } from "@/components/public/section-title";
import { SocialIcon } from "@/components/public/social-icon";
import { cn } from "@/lib/utils/cn";
import type { LinksBlockData } from "@/lib/blocks/schemas";
import type { LinkIcon, PublicLink } from "@/lib/public-page/types";

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
 *
 * ── Layout, featured links and icons ────────────────────────────────────────
 *
 * A grid is a *layout* of this block rather than a block of its own, and that
 * is a data-model decision with a visible consequence: the buttons in a grid
 * are the same `links` rows with the same ids going through the same
 * `/go/<id>`, so a creator who switches a section to a grid does not restart
 * its analytics or split one link's clicks across two identities.
 *
 * A featured link is the same element with more of the page's own weight
 * behind it — never a second component and never its own colours. In a grid it
 * takes the full row, because a grid's whole job is to make four links equal
 * and a featured one is not.
 *
 * The icon is decorative in the markup sense: the link's accessible name is
 * its title, and adding the platform's name to it would have a screen reader
 * announce "Instagram Instagram".
 */
export function LinksBlock({ data, links }: { data: LinksBlockData; links: PublicLink[] }) {
  const title = data.title.trim();
  const grid = data.layout === "grid";

  return (
    <nav aria-label={title.length > 0 ? title : "Links"}>
      <SectionTitle>{data.title}</SectionTitle>

      <ul className={grid ? "sm-links-grid" : "sm-links"}>
        {links.map((link) => (
          <li key={link.id} className={grid && link.featured ? "sm-grid-wide" : undefined}>
            {/*
              * `/go/<id>` rather than the destination itself. The click is the
              * request, so it cannot be lost to a navigation that starts
              * before a beacon leaves — which on a slow phone is a large share
              * of them. The destination is never in this URL: it is looked up
              * from the row, so there is no parameter to override and no open
              * redirect to find.
              */}
            <a
              href={`/go/${link.id}`}
              rel="nofollow ugc noopener"
              className={cn("sm-button", link.featured && "sm-button-featured")}
              data-featured={link.featured ? "true" : undefined}
            >
              {link.icon ? <LinkMark icon={link.icon} /> : null}
              <span className="sm-button-label">{link.title}</span>
              {/*
                * A spacer the width of the mark, so the label stays optically
                * centred instead of being pushed off-centre by the icon. It
                * collapses to nothing on a left-aligned button style.
                */}
              {link.icon ? <span className="sm-button-balance" aria-hidden /> : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The little picture on a button.
 *
 * A platform mark is one of the eighteen glyphs already inlined for the
 * socials row, so it costs nothing extra on the wire. An uploaded icon is an
 * `<Image>` from our own bucket at 48px — twice its rendered size, for a
 * retina screen, and no larger.
 *
 * `aria-hidden` in both cases. The button already says what it is.
 */
function LinkMark({ icon }: { icon: LinkIcon }) {
  if (icon.kind === "platform") {
    return (
      <span className="sm-button-icon" aria-hidden>
        <SocialIcon platform={icon.platform} className="h-full w-full" />
      </span>
    );
  }

  return (
    <span className="sm-button-icon sm-button-icon-image" aria-hidden>
      <Image src={icon.url} alt="" width={48} height={48} className="h-full w-full object-cover" />
    </span>
  );
}
