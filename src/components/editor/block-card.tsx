"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockIcon } from "@/components/editor/block-icon";
import { Icon, ICONS, IconButton, Toggle } from "@/components/editor/controls";
import { BlockForm } from "@/components/editor/forms";
import { BLOCKS } from "@/lib/blocks/registry";
import { cn } from "@/lib/utils/cn";
import type { DraftBlock, DraftSocial } from "@/lib/editor/state";
import type {
  ContactBlockData,
  DividerBlockData,
  EmbedBlockData,
  GalleryBlockData,
  HeadingBlockData,
  ImageBlockData,
  LinksBlockData,
  SpacerBlockData,
  TextBlockData,
  VideoBlockData,
} from "@/lib/blocks/schemas";

/**
 * One block in the editor's list.
 *
 * Collapsed it is a row: what kind of block, what is in it, and whether it is
 * on the page. Expanded it grows a form. That is deliberate — a page with
 * eight blocks and eight open forms is a wall, and the thing a creator does
 * most often is reorder and toggle rather than edit.
 *
 * Reordering has two mechanisms and they are not redundant. Dragging is what
 * people reach for; the up and down buttons are what work with a keyboard, a
 * screen reader, or a thumb on a small screen where a drag competes with the
 * page's own scroll. dnd-kit's keyboard sensor covers some of that, but a
 * button that says "Move up" needs no discovery at all.
 */

export interface BlockCardProps {
  block: DraftBlock;
  index: number;
  count: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  update: (patch: Partial<DraftBlock>) => void;
  remove: () => void;
  move: (delta: 1 | -1) => void;
  socials: DraftSocial[];
  setSocials: (socials: DraftSocial[]) => void;
  /** Set when a failed save named this block, so it can say why. */
  problem?: string;
}

export function BlockCard(props: BlockCardProps) {
  const { block, index, count, expanded, onToggleExpanded, update, remove, move, problem } =
    props;

  const definition = BLOCKS[block.type];
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const panelId = `block-panel-${block.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "rounded-card border bg-surface transition-shadow",
        isDragging ? "z-10 border-border-strong shadow-card" : "border-border",
        problem && "border-danger",
        !block.isVisible && "bg-surface-sunken",
      )}
    >
      <div className="flex min-w-0 items-center gap-1 p-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Reorder ${definition.label} block`}
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-ink-subtle transition-colors hover:text-ink active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <Icon d={ICONS.grip} className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          /*
           * `aria-controls` only while the panel exists. An IDREF that
           * resolves to nothing is not a harmless leftover — assistive
           * technology is told this button controls a region and then finds
           * no region, and the collapsed state is the common case, so that
           * was true for most of the buttons on the page at any moment.
           * `aria-expanded` is what carries the state; `aria-controls` is
           * only meaningful once there is something to point at.
           */
          aria-controls={expanded && definition.configurable ? panelId : undefined}
          disabled={!definition.configurable}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control px-1.5 py-1.5 text-left transition-colors hover:bg-surface-sunken disabled:pointer-events-none"
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-control",
              block.isVisible ? "bg-surface-sunken text-ink-muted" : "text-ink-subtle",
            )}
          >
            <BlockIcon type={block.type} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {definition.label}
            </span>
            <span className="block truncate text-[0.8125rem] text-ink-subtle">
              {summarize(props)}
            </span>
          </span>

          {definition.configurable ? (
            <Icon
              d={ICONS.chevron}
              className={cn(
                "h-4 w-4 shrink-0 text-ink-subtle transition-transform",
                expanded && "rotate-180",
              )}
            />
          ) : null}
        </button>

        <div className="flex shrink-0 items-center">
          <IconButton label="Move block up" onClick={() => move(-1)} disabled={index === 0}>
            <Icon d={ICONS.up} className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Move block down"
            onClick={() => move(1)}
            disabled={index === count - 1}
          >
            <Icon d={ICONS.down} className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {problem ? (
        <p role="alert" className="px-3 pb-2 text-[0.8125rem] text-danger">
          {problem}
        </p>
      ) : null}

      {expanded && definition.configurable ? (
        <div id={panelId} className="border-t border-border p-3">
          <BlockForm
            block={block}
            update={update}
            socials={props.socials}
            setSocials={props.setSocials}
          />

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <Toggle
                checked={block.isVisible}
                onChange={(isVisible) => update({ isVisible })}
                label={`Show the ${definition.label} block on the page`}
              />
              <span className="text-[0.8125rem] text-ink-muted">
                {block.isVisible ? "On your page" : "Hidden"}
              </span>
            </div>

            <button
              type="button"
              onClick={remove}
              className="flex h-8 items-center gap-1.5 rounded-control px-2.5 text-[0.8125rem] text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-danger"
            >
              <Icon d={ICONS.trash} className="h-3.5 w-3.5" />
              Delete block
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * What this block currently holds, in a few words.
 *
 * The line that makes a collapsed list usable: "3 links" and "Gallery · 4
 * images" tell a creator which card to open, where "Links" three times over
 * tells them nothing. Hidden is said first because it changes what everything
 * else means.
 */
function summarize({ block, socials }: BlockCardProps): string {
  const hidden = block.isVisible ? "" : "Hidden · ";

  switch (block.type) {
    case "links": {
      const { title, layout } = block.data as LinksBlockData;
      const live = block.links.filter((link) => link.isActive).length;
      const count = block.links.length;
      const noun = `${count} ${count === 1 ? "link" : "links"}`;
      const drafts = count - live > 0 ? `, ${count - live} hidden` : "";
      /*
       * Links with a schedule are counted separately from hidden ones. A
       * creator looking at "4 links, 1 hidden" when one of them is actually
       * waiting for Friday would go looking for a switch that is not the
       * problem.
       *
       * "with dates" rather than "scheduled", deliberately: the badge on a row
       * uses "Scheduled" to mean *not started yet*, and an expired link would
       * be counted here under a word that says the opposite of its own badge.
       * This count is also time-independent, which keeps a server-rendered
       * summary from disagreeing with the browser's clock.
       */
      const timed = block.links.filter(
        (link) => link.startsAt !== null || link.endsAt !== null,
      ).length;
      const scheduled = timed > 0 ? `, ${timed} with dates` : "";
      const grid = layout === "grid" ? "Grid · " : "";
      return `${hidden}${grid}${title.trim() || noun}${title.trim() ? ` · ${noun}` : ""}${drafts}${scheduled}`;
    }

    case "socials": {
      const live = socials.filter((social) => social.isActive).length;
      return `${hidden}${live} ${live === 1 ? "profile" : "profiles"}`;
    }

    case "text": {
      const { text } = block.data as TextBlockData;
      return `${hidden}${text.trim() || "Empty"}`;
    }

    case "heading": {
      const { text, level } = block.data as HeadingBlockData;
      const kind = level === "subsection" ? "Subsection" : "Section";
      return `${hidden}${text.trim() ? `${text.trim()} · ${kind}` : "Empty"}`;
    }

    case "contact": {
      const { title, items } = block.data as ContactBlockData;
      if (items.length === 0) return `${hidden}Nothing to reach you by yet`;
      const kinds = [...new Set(items.map((item) => item.kind))].join(", ");
      return `${hidden}${title.trim() ? `${title.trim()} · ${kinds}` : kinds}`;
    }

    case "spacer": {
      const { size } = block.data as SpacerBlockData;
      return `${hidden}${size.charAt(0).toUpperCase()}${size.slice(1)} gap`;
    }

    case "image": {
      const { url, alt } = block.data as ImageBlockData;
      if (url.length === 0) return `${hidden}No image yet`;
      return `${hidden}${alt.trim() || "Image"}`;
    }

    case "image_gallery": {
      const { title, items, layout } = block.data as GalleryBlockData;
      const noun = `${items.length} ${items.length === 1 ? "image" : "images"}`;
      const shape = layout === "grid" ? "Grid · " : "";
      return `${hidden}${shape}${title.trim() ? `${title.trim()} · ${noun}` : noun}`;
    }

    case "video":
    case "embed": {
      const { url, title } = block.data as VideoBlockData | EmbedBlockData;
      if (url.length === 0) return `${hidden}Nothing linked yet`;
      return `${hidden}${title.trim() || url}`;
    }

    case "divider": {
      const { style } = block.data as DividerBlockData;
      return `${hidden}${style === "space" ? "Just space" : style === "subtle" ? "A faint line" : "A line"}`;
    }

    default:
      return hidden;
  }
}
