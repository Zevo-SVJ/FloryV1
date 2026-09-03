import Link from "next/link";
import { PageShare } from "@/components/public/page-share";

/**
 * The bottom of a creator's page.
 *
 * Two things, and a decision about restraint that is worth stating because the
 * temptation runs the other way. A link-in-bio page is the most tempting
 * surface in software to cover in "Create your own!" — and the fastest way to
 * make a creator move to a competitor, because the page belongs to them and
 * every pixel of ours on it is rent.
 *
 * So: one share affordance, because a visitor passing the page on is the only
 * growth mechanism here that serves the creator as much as it serves us, and
 * one wordmark at the type size of a caption. Both sit below the fold of any
 * page with content on it. Nothing animates, nothing floats, nothing appears
 * after a delay, and there is no interstitial anywhere in this product.
 *
 * Both take their colour from the page's own muted token, so the footer
 * belongs to whichever theme the creator chose rather than announcing itself
 * in our brand colour on top of theirs.
 */
export function PageFooter({ url, title }: { url: string; title: string }) {
  return (
    <footer className="sm-footer">
      <PageShare url={url} title={title} />

      <span className="sm-footer-dot" aria-hidden>
        ·
      </span>

      {/*
       * An ordinary internal link, not `nofollow`. It points at our own
       * homepage, which is the one destination on a creator page that is not
       * user-generated — the `nofollow ugc` on every link button is there to
       * stop ShowMe becoming a place to buy backlinks, and this is not that.
       */}
      <Link href="/" className="sm-footer-action">
        ShowMe
      </Link>
    </footer>
  );
}
