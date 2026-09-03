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
 * happens to end near the viewport edge looks like a gallery that ended.
 *
 * `snap-mandatory` with `scroll-pl-5` lines each card up against the same left
 * edge as the rest of the page, so a mid-scroll gallery still reads as part of
 * the column rather than as something floating over it.
 */

const ASPECT: Record<GalleryBlockData["aspect"], string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  wide: "aspect-[16/9]",
};

/*
 * Card widths, and therefore what the optimizer is asked for. `wide` gets more
 * room because a 16:9 image at 68% of a phone is unreadably small; `portrait`
 * and `square` are comfortable narrow.
 */
const WIDTH: Record<GalleryBlockData["aspect"], string> = {
  square: "w-[68%] sm:w-[46%]",
  portrait: "w-[68%] sm:w-[46%]",
  wide: "w-[86%] sm:w-[60%]",
};

const SIZES = "(max-width: 34rem) 68vw, 14rem";

export function GalleryBlock({ id, data }: { id: string; data: GalleryBlockData }) {
  const scrollerId = `gallery-${id}`;
  const label = data.title.trim().length > 0 ? data.title.trim() : "gallery";

  return (
    <section aria-label={data.title.trim() || "Image gallery"}>
      <SectionTitle>{data.title}</SectionTitle>

      {/*
       * Negative margins pull the scroller out to the page edge so images can
       * bleed off it, while the padding puts the first card back in line with
       * the column. Without this the row would stop short of the edge and look
       * boxed in.
       */}
      <ul
        id={scrollerId}
        className="-mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {data.items.map((item) => (
          <li key={item.id} className={cn("shrink-0 snap-start", WIDTH[data.aspect])}>
            <figure>
              <div
                className={cn(
                  "relative overflow-hidden rounded-card bg-surface-sunken",
                  ASPECT[data.aspect],
                )}
              >
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  sizes={SIZES}
                  className="object-cover"
                />
              </div>
              {item.caption.trim().length > 0 ? (
                <figcaption className="mt-2 text-[0.8125rem] leading-snug text-ink-subtle">
                  {item.caption}
                </figcaption>
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
          className="mt-4 flex min-h-12 items-center justify-center rounded-control bg-ink px-5 text-center text-[0.9375rem] font-medium text-canvas transition-opacity hover:opacity-90"
        >
          {data.cta.label}
        </a>
      ) : null}
    </section>
  );
}
