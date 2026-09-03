import { ProfileHeader } from "@/components/public/profile-header";
import { PublicBlockView } from "@/components/public/blocks";
import { PageSurface } from "@/components/public/page-surface";
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
}: {
  page: PublicPageData;
  design: ResolvedDesign;
}) {
  return (
    <PageSurface design={design}>
      <ProfileHeader profile={page.profile} />

      {page.blocks.length > 0 ? (
        <div className="sm-stack" style={{ marginTop: "var(--sm-gap)" }}>
          {page.blocks.map((block) => (
            <PublicBlockView key={block.id} block={block} />
          ))}
        </div>
      ) : null}

      {isEmptyPage(page) ? <EmptyPage /> : null}
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
