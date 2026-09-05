import {
  CalloutBlock, ChecklistBlock, CodeBlock, ComparisonBlock, ExpandableBlock,
  HeadingBlock, ImageBlock, PromptBlock, QuoteBlock, StepsBlock, TableBlock,
  TerminalBlock, TextBlock, VideoBlock,
} from "@/components/learning/blocks/static-blocks";
import {
  BooleanBlock, ChoiceBlock, DecisionBlock, OpenPromptBlock, OrderingBlock, Reveal,
} from "@/components/learning/blocks/interactive-blocks";
import type { Block } from "@/lib/learning/blocks";
import type { LearnerBlockResponseRow } from "@/types/database";

/**
 * One block, dispatched on its kind.
 *
 * A `switch` rather than a lookup object keyed by kind, and the reason is worth
 * writing down: the union is discriminated, so TypeScript narrows `block` to
 * the exact member inside each case and every component gets its own precise
 * prop type. A `Record<BlockKind, Component>` cannot express that — every entry
 * would take the whole union and each component would have to re-narrow it.
 *
 * The `default` case is not defensive padding. Assigning `block` to `never`
 * makes a forgotten case a compile error, so adding a block kind to the schema
 * without rendering it cannot ship.
 *
 * Adding a block type is therefore: a schema in `lib/learning/blocks.ts`, a
 * case here, a component. No migration, and nothing else in the system changes.
 *
 * This component is also where "commit before reveal" is enforced. The
 * interactive components are Client Components, and a Client Component's props
 * are serialized into the page — so passing the whole block put every
 * explanation and every answer key into the HTML of a lesson nobody had
 * answered. Verified in a browser, and it was leaking. So the reveal is built
 * *here*, on the server, and passed as an already rendered node only when a
 * response exists. Unrendered children are never serialized.
 */
export function ContentBlock({
  block,
  lessonId,
  lessonSlug,
  response,
}: {
  block: Block;
  lessonId: string;
  lessonSlug: string;
  /** What this learner already answered, if anything. Drives the reveal. */
  response?: LearnerBlockResponseRow;
}) {
  const shared = { lessonId, lessonSlug, saved: response };

  switch (block.kind) {
    case "heading":
      return <HeadingBlock block={block} />;
    case "text":
      return <TextBlock block={block} />;
    case "callout":
      return <CalloutBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "image":
      return <ImageBlock block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "terminal":
      return <TerminalBlock block={block} />;
    case "prompt":
      return <PromptBlock block={block} />;
    case "checklist":
      return <ChecklistBlock block={block} />;
    case "steps":
      return <StepsBlock block={block} />;
    case "comparison":
      return <ComparisonBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "expandable":
      return <ExpandableBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "choice":
      return (
        <ChoiceBlock
          blockId={block.id}
          question={block.question}
          multiple={block.multiple}
          options={block.options}
          reveal={response ? <Reveal label="Explanation">{block.explanation}</Reveal> : null}
          {...shared}
        />
      );
    case "boolean":
      return (
        <BooleanBlock
          blockId={block.id}
          question={block.question}
          reveal={response ? <Reveal label="Explanation">{block.explanation}</Reveal> : null}
          {...shared}
        />
      );
    case "ordering":
      return (
        <OrderingBlock
          blockId={block.id}
          question={block.question}
          items={block.items}
          reveal={response ? <Reveal label="Explanation">{block.explanation}</Reveal> : null}
          {...shared}
        />
      );
    case "decision": {
      const recommended = block.options.find((option) => option.id === block.recommended);
      return (
        <DecisionBlock
          blockId={block.id}
          situation={block.situation}
          options={block.options}
          reveal={
            response ? (
              <Reveal label={`What LOCK would do — ${recommended?.label ?? block.recommended}`}>
                {block.explanation}
              </Reveal>
            ) : null
          }
          {...shared}
        />
      );
    }
    case "predict":
      return (
        <OpenPromptBlock
          blockId={block.id}
          label="Predict before you read on"
          situation={block.situation}
          question={block.prompt}
          submitLabel="Commit to my prediction"
          reveal={response ? <Reveal label="The analysis">{block.reveal}</Reveal> : null}
          {...shared}
        />
      );
    case "your_move":
      return (
        <OpenPromptBlock
          blockId={block.id}
          label="Your move"
          question={block.prompt}
          submitLabel="Commit to my answer"
          reveal={response ? <Reveal>{block.reveal}</Reveal> : null}
          {...shared}
        />
      );
    case "short_answer":
      return (
        <OpenPromptBlock
          blockId={block.id}
          label="In your own words"
          question={block.question}
          guidance={block.guidance}
          submitLabel="Save answer"
          {...shared}
        />
      );
    case "reflection":
      return (
        <OpenPromptBlock
          blockId={block.id}
          label="Reflection"
          question={block.prompt}
          submitLabel="Save reflection"
          {...shared}
        />
      );
    default: {
      const exhaustive: never = block;
      void exhaustive;
      return null;
    }
  }
}

/**
 * A lesson's body.
 *
 * The measure is set here, once, rather than by each block: 44rem is about 75
 * characters, which is where prose stops being comfortable. Blocks that cannot
 * reflow — code, tables — break out of it by scrolling inside themselves.
 */
export function ContentRenderer({
  blocks,
  lessonId,
  lessonSlug,
  responses,
}: {
  blocks: Block[];
  lessonId: string;
  lessonSlug: string;
  responses: Map<string, LearnerBlockResponseRow>;
}) {
  return (
    <div className="max-w-measure space-y-6">
      {blocks.map((block) => (
        <ContentBlock
          key={block.id}
          block={block}
          lessonId={lessonId}
          lessonSlug={lessonSlug}
          response={responses.get(block.id)}
        />
      ))}
    </div>
  );
}
