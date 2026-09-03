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
 * The call to action is `.sm-button`: the same button as a link, so a gallery
 * never grows its own dialect of the page's design.
 */

const ASPECT: Record<GalleryBlockData["aspect"], string> = {
  square: "sm-ratio-square",
  portrait: "sm-ratio-portrait",
  wide: "sm-ratio-wide",
};

const SIZES = "(max-width: 34rem) 68vw, 17rem";

export function GalleryBlock({ id, data }: { id: string; data: GalleryBlockData }) {
  const scrollerId = `gallery-${id}`;
  const label = data.title.trim().length > 0 ? data.title.trim() : "gallery";

  return (
    <section aria-label={data.title.trim() || "Image gallery"}>
      <SectionTitle>{data.title}</SectionTitle>

      <ul id={scrollerId} className="sm-gallery" data-aspect={data.aspect}>
        {data.items.map((item) => (
          <li key={item.id}>
            <figure>
              <div className={cn("sm-media relative", ASPECT[data.aspect])}>
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  sizes={SIZES}
                  className="object-cover"
                />
              </div>
              {item.caption.trim().length > 0 ? (
                <figcaption className="sm-caption">{item.caption}</figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>

      <GalleryControls scrollerId={scrollerId} label={label} />

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
