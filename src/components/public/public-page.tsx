import { ProfileHeader } from "@/components/public/profile-header";
import { SocialRow } from "@/components/public/social-row";
import { LinkList } from "@/components/public/link-list";
import { BlockRenderer } from "@/components/public/block-renderer";
import { isEmptyPage, type PublicPage as PublicPageData } from "@/lib/public-page/types";

/**
 * A creator's page.
 *
 * The whole surface, assembled in the order attention arrives: who this is,
 * where else they are, what they want you to open, then anything else they
 * have added.
 *
 * Every part of this tree is a Server Component. There is no `use client`
 * anywhere beneath it and nothing to hydrate — a visitor gets finished HTML,
 * and the only JavaScript on the page is whatever Next.js needs for its own
 * router. That is the point: this is opened from a phone, on mobile data, by
 * somebody who will give it about a second.
 *
 * The column stays narrow on every screen. A creator page that stretches to
 * fill a desktop monitor stops looking like a page somebody made and starts
 * looking like a dashboard.
 *
 * The content is centred with `m-auto` rather than `justify-center`. Most new
 * pages are short — a name and two links — and top-aligning those leaves two
 * thirds of a desktop screen empty below them. Auto margins centre what fits
 * and fall back to normal flow when it does not, where `justify-center` would
 * push the top of a long page out of reach.
 */
export function PublicPage({ page }: { page: PublicPageData }) {
  return (
    <main className="flex min-h-dvh w-full flex-col px-5 py-14 sm:py-20">
      <div className="m-auto w-full max-w-[30rem]">
        <ProfileHeader profile={page.profile} />
        <SocialRow socials={page.socials} />
        <LinkList links={page.links} />
        <BlockRenderer blocks={page.blocks} />

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
  return (
    <p className="mt-10 text-center text-sm text-ink-subtle">
      Nothing here yet.
    </p>
  );
}
