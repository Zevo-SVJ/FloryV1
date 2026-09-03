import { EmbedFrame } from "@/components/public/blocks/embed-frame";
import { GalleryBlock } from "@/components/public/blocks/gallery-block";
import { ImageBlock } from "@/components/public/blocks/image-block";
import { LinksBlock } from "@/components/public/blocks/links-block";
import { SocialsBlock } from "@/components/public/blocks/socials-block";
import { TextBlock } from "@/components/public/blocks/text-block";
import { EMBED_PROVIDERS, VIDEO_PROVIDERS, resolveEmbed } from "@/lib/embeds/providers";
import type { PublicBlock } from "@/lib/public-page/types";

/**
 * One block, drawn.
 *
 * The only place in the renderer that switches on a block's kind. `shape.ts`
 * has already validated the data and narrowed the union, so each case
 * destructures real fields rather than casting — and a block type added to the
 * registry without a case here is a compile error, not a gap on somebody's
 * page.
 *
 * Nothing in this file or below it renders HTML from user data.
 */
export function PublicBlockView({ block }: { block: PublicBlock }) {
  switch (block.kind) {
    case "links":
      return <LinksBlock data={block.data} links={block.links} />;

    case "socials":
      return <SocialsBlock socials={block.socials} />;

    case "text":
      return <TextBlock data={block.data} />;

    case "image":
      return <ImageBlock data={block.data} />;

    case "image_gallery":
      return <GalleryBlock id={block.id} data={block.data} />;

    case "video": {
      /*
       * Resolved again rather than carried through the shape. It is a pure
       * function of the URL, and re-running it here means the frame source is
       * built next to the element that uses it — there is no `src` travelling
       * through the data model that somebody could later be tempted to set.
       */
      const embed = resolveEmbed(block.data.url, VIDEO_PROVIDERS);
      return embed ? <EmbedFrame embed={embed} title={block.data.title} /> : null;
    }

    case "embed": {
      const embed = resolveEmbed(block.data.url, EMBED_PROVIDERS);
      return embed ? <EmbedFrame embed={embed} title={block.data.title} /> : null;
    }

    case "divider":
      return <hr className="border-border" />;
  }
}
