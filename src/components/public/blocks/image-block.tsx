import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ImageBlockData } from "@/lib/blocks/schemas";

/**
 * One picture, sometimes a button.
 *
 * The block a visual creator reaches for first: a shot of the new drop, linked
 * to the shop. Its corner radius, its border and its shadow are the page's
 * block style — but never its padding and never a fill behind it. A card drawn
 * around a photograph is what makes a page look like a database rather than
 * something somebody made, so `.sm-media` takes the radius from the design and
 * stops there.
 *
 * `sizes` matters more here than anywhere else on the page. The column is at
 * most 36rem wide, so telling the optimizer that keeps it from serving a
 * 2000px original to a phone that will paint it at 390.
 */

const ASPECT: Record<ImageBlockData["aspect"], string | null> = {
  auto: null,
  square: "sm-ratio-square",
  wide: "sm-ratio-wide",
  portrait: "sm-ratio-portrait",
};

const SIZES = "(max-width: 40rem) 100vw, 36rem";

export function ImageBlock({ data }: { data: ImageBlockData }) {
  const ratio = ASPECT[data.aspect];

  /*
   * `alt` is the creator's if they wrote one, and empty otherwise — never a
   * filename and never "image". An empty alt marks the image as decorative,
   * which is what an undescribed picture actually is, and is far better than
   * making a screen reader read out a URL.
   *
   * When the image is a link, the alt carries more weight: it becomes the
   * link's accessible name. The fallback below is the honest minimum.
   */
  const described = data.alt.trim().length > 0;

  const picture = (
    <div className={cn("sm-media relative", ratio)}>
      {ratio ? (
        <Image src={data.url} alt={data.alt} fill sizes={SIZES} className="object-cover" />
      ) : (
        /*
         * No fixed ratio: let the image decide its own height. `width`/`height`
         * are the intrinsic-size hint Next.js needs to reserve space; the CSS
         * below overrides both, so the rendered result is the natural aspect
         * of whatever was uploaded rather than a 1600×1600 box.
         */
        <Image
          src={data.url}
          alt={data.alt}
          width={1600}
          height={1600}
          sizes={SIZES}
          className="h-auto w-full"
        />
      )}
    </div>
  );

  if (!data.href) return picture;

  return (
    <a
      href={data.href}
      rel="nofollow ugc noopener"
      className="block transition-opacity hover:opacity-90"
    >
      {picture}
      {!described ? <span className="sr-only">Open link</span> : null}
    </a>
  );
}
