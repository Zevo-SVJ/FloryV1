import Image from "next/image";
import { GalleryControls } from "@/components/public/blocks/gallery-controls";
import { SectionTitle } from "@/components/public/section-title";
import { cn } from "@/lib/utils/cn";
import type { GalleryBlockData } from "@/lib/blocks/schemas";

/**
 * Several images, side by side.
 *
 * A scroll-snap row rather than a JavaScript carousel. On a phone that is the
 * native gesture with native momentum and no library; on a desktop it is a
 * trackpad swipe, with arrows added by a small Client Component for people
 * using a mouse. The images themselves are server rendered either way.
 *
 * Cards are sized so the next one peeks past the right edge. That single
 * detail is what tells a visitor the row scrolls — without it, a gallery that
 * happens to end near the viewport edge looks like a gallery that ended. The
 * widths, the snapping and the bleed to the page edge all live in the
 * stylesheet, because they change with the page's width setting.
 *
 * A grid is the other option, and it is a real choice rather than a setting: a
 * row is better for three shots of a drop, where the peek says "keep going",
 * and a grid is better for nine pieces of work, where the whole set is the
 * point. The arrows only appear for the row, because a grid does not scroll.
 *
 * An image can be a link. Those clicks are not tracked, and the reason is
 * worth being straight about: a click row references a link id, and a gallery
 * image is JSON inside a block with no row of its own. Creating shadow `links`
 * rows for each image would double every page's link count and fill the
 * dashboard's "top links" with entries the creator never made — which is a
 * worse outcome than a number that honestly is not there.
 *
 * The call to action is `.sm-button`: the same button as a link, so a gallery
 * never grows its own dialect of the page's design.
 */

const ASPECT: Record<GalleryBlockData["aspect"], string> = {
  square: "sm-ratio-square",
  portrait: "sm-ratio-portrait",
  wide: "sm-ratio-wide",
};

const SIZES = "(max-width: 34rem) 68vw, 17rem";
/** Two columns below `sm`, three above, inside a column at most 36rem wide. */
const GRID_SIZES = "(max-width: 34rem) 46vw, 12rem";

/**
 * One image, with its caption, and sometimes a link around it.
 *
 * The anchor wraps the picture and not the caption: a caption is a
 * description, and swallowing it into the link's accessible name turns
 * "Spring collection" into a sentence read out as the destination. When the
 * image has no alt text and is a link, the anchor gets a `sr-only` name — an
 * unnamed link is the single worst thing on a page for a screen reader.
 */
function Figure({
  item,
  aspect,
  sizes,
}: {
  item: GalleryBlockData["items"][number];
  aspect: GalleryBlockData["aspect"];
  sizes: string;
}) {
  const caption = item.caption.trim();
  const described = item.alt.trim().length > 0;

  const picture = (
    <div className={cn("sm-media relative", ASPECT[aspect])}>
      <Image src={item.url} alt={item.alt} fill sizes={sizes} className="object-cover" />
    </div>
  );

  return (
    <figure>
      {item.href ? (
        <a
          href={item.href}
          rel="nofollow ugc noopener"
          className="block transition-opacity hover:opacity-90"
        >
          {picture}
          {!described ? <span className="sr-only">Open link</span> : null}
        </a>
      ) : (
        picture
      )}
      {caption.length > 0 ? <figcaption className="sm-caption">{caption}</figcaption> : null}
    </figure>
  );
}

export function GalleryBlock({ id, data }: { id: string; data: GalleryBlockData }) {
  const scrollerId = `gallery-${id}`;
  const label = data.title.trim().length > 0 ? data.title.trim() : "gallery";
  const scrolls = data.layout === "carousel";

  return (
    <section aria-label={data.title.trim() || "Image gallery"}>
      <SectionTitle>{data.title}</SectionTitle>

      <ul
        id={scrollerId}
        className={scrolls ? "sm-gallery" : "sm-gallery-grid"}
        data-aspect={data.aspect}
      >
        {data.items.map((item) => (
          <li key={item.id}>
            <Figure item={item} aspect={data.aspect} sizes={scrolls ? SIZES : GRID_SIZES} />
          </li>
        ))}
      </ul>

      {scrolls ? <GalleryControls scrollerId={scrollerId} label={label} /> : null}

      {data.cta ? (
        <a
          href={data.cta.url}
          rel="nofollow ugc noopener"
          className="sm-button"
          style={{ marginTop: "1rem" }}
        >
          {data.cta.label}
        </a>
      ) : null}
    </section>
  );
}
