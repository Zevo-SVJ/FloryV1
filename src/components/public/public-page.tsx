import { ProfileHeader } from "@/components/public/profile-header";
import { PublicBlockView } from "@/components/public/blocks";
import { isEmptyPage, type PublicPage as PublicPageData } from "@/lib/public-page/types";

/**
 * A creator's page.
 *
 * The header, then whatever the creator arranged. Phase 3 hard-coded the order
 * — socials, then links, then blocks; Phase 4 made every one of those a block,
 * so this component no longer decides what comes first. The array is the page.
 *
 * Every part of this tree is a Server Component except the gallery's arrows.
 * A visitor gets finished HTML, and the only JavaScript that ships is Next's
 * own router plus a few hundred bytes on pages that actually have a gallery.
 * That is the point: this is opened from a phone, on mobile data, by somebody
 * who will give it about a second.
 *
 * The column stays narrow on every screen. A creator page that stretches to
 * fill a desktop monitor stops looking like a page somebody made and starts
 * looking like a dashboard.
 *
 * Spacing does the work that borders would. Blocks are separated by one
 * generous rhythm rather than each being wrapped in a card — the page should
 * read as one thing a person composed, not as a list of records.
 */
export function PublicPage({ page }: { page: PublicPageData }) {
  return (
    <main className="flex min-h-dvh w-full flex-col px-5 py-14 sm:py-20">
      <div className="m-auto w-full max-w-[30rem]">
        <ProfileHeader profile={page.profile} />

        {page.blocks.length > 0 ? (
          <div className="mt-9 flex flex-col gap-9">
            {page.blocks.map((block) => (
              <PublicBlockView key={block.id} block={block} />
            ))}
          </div>
        ) : null}

        {isEmptyPage(page) ? <EmptyPage /> : null}
      </div>
    </main>
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
  return <p className="mt-10 text-center text-sm text-ink-subtle">Nothing here yet.</p>;
}
