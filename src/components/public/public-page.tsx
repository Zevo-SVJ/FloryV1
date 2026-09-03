import { ProfileHeader } from "@/components/public/profile-header";
import { PublicBlockView } from "@/components/public/blocks";
import { PageFooter } from "@/components/public/page-footer";
import { PageSurface } from "@/components/public/page-surface";
import { ViewBeacon } from "@/components/public/view-beacon";
import { isEmptyPage, type PublicPage as PublicPageData } from "@/lib/public-page/types";
import type { ResolvedDesign } from "@/lib/design/types";

/**
 * A creator's page: content, plus the design it is wearing.
 *
 * The two arrive separately and stay separate. `page` is what the creator
 * wrote — names, links, images, the order of it all — and `design` is how it
 * looks. Nothing in this tree reads one to decide the other, which is what
 * makes switching theme a change to six words in a JSON column rather than a
 * migration of everything a creator has made.
 *
 * Every component here is a Server Component except the gallery's arrows. A
 * visitor gets finished HTML, one font file, and a few hundred bytes of
 * behaviour on pages that actually have a gallery.
 *
 * The column is centred with `margin: auto` rather than `justify-content`.
 * Most new pages are short — a name and two links — and top-aligning those
 * leaves two thirds of a desktop screen empty below them. Auto margins centre
 * what fits and fall back to normal flow when it does not, where centring
 * would push the top of a long page out of reach.
 */
export function PublicPage({
  page,
  design,
  address,
  tracked = false,
}: {
  page: PublicPageData;
  design: ResolvedDesign;
  /**
   * The page's own absolute URL, for the footer's share button.
   *
   * Passed in rather than built here, because the canonical origin is a piece
   * of server configuration and this component also renders inside the
   * editor's preview in a browser. One place decides what a page's address
   * is, and it is the same place the canonical tag and the QR code read.
   */
  address: string;
  /**
   * Whether this render is the live page rather than the editor's preview.
   *
   * The preview is the same components on the same data, which is the point —
   * and which is exactly why it must not report a view. A creator adjusting
   * their theme would otherwise spend the afternoon inflating their own
   * numbers.
   */
  tracked?: boolean;
}) {
  return (
    <PageSurface design={design}>
      {tracked ? <ViewBeacon username={page.profile.username} /> : null}
      <ProfileHeader profile={page.profile} />

      {page.blocks.length > 0 ? (
        <div className="sm-stack" style={{ marginTop: "var(--sm-gap)" }}>
          {page.blocks.map((block) => (
            <PublicBlockView key={block.id} block={block} />
          ))}
        </div>
      ) : null}

      {isEmptyPage(page) ? <EmptyPage /> : null}

      <PageFooter
        url={address}
        title={page.profile.displayName ?? `@${page.profile.username}`}
      />
    </PageSurface>
  );
}

/**
 * A page whose owner has not added anything yet.
 *
 * Somebody has arrived here from a real link, so the page has to say something
 * true rather than look broken. It does not apologise, does not invent
 * placeholder links, and does not advertise ShowMe at a visitor who came to
 * see a person.
 */
function EmptyPage() {
  return (
    <p className="sm-text sm-align-center" style={{ marginTop: "2.5rem" }}>
      Nothing here yet.
    </p>
  );
}
