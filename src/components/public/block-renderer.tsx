import { isRenderableBlockType, type TextBlockData } from "@/lib/public-page/blocks";
import type { PublicBlock } from "@/lib/public-page/types";

/**
 * Future page content, rendered safely today.
 *
 * The editor for these arrives in Phase 4. What exists now is the pipeline a
 * block travels: the query validates `data` against the block's schema and
 * drops anything that does not fit, so by the time it reaches this component
 * it is a known type with a known shape.
 *
 * Two rules hold here permanently. A type this renderer does not implement
 * renders nothing — never a placeholder, never an error, because a stranger
 * looking at a creator's page should not be told about the state of our block
 * catalogue. And nothing from `data` ever becomes markup: text is placed as
 * text, which React escapes, and there is no `dangerouslySetInnerHTML` in this
 * file or below it.
 */
export function BlockRenderer({ blocks }: { blocks: PublicBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="mt-8 flex flex-col gap-5">
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: PublicBlock }) {
  if (!isRenderableBlockType(block.type)) return null;

  switch (block.type) {
    case "text": {
      const { text } = block.data as TextBlockData;
      return (
        <p className="text-center text-[0.9375rem] leading-relaxed text-ink-muted">
          {text}
        </p>
      );
    }

    case "divider":
      return <hr className="border-border" />;

    default:
      return null;
  }
}
