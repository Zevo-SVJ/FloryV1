import type { z } from "zod";
import type { BlockType } from "@/types/database";
import {
  contactBlockSchema,
  dividerBlockSchema,
  embedBlockSchema,
  galleryBlockSchema,
  headingBlockSchema,
  imageBlockSchema,
  linksBlockSchema,
  socialsBlockSchema,
  spacerBlockSchema,
  textBlockSchema,
  type ContactBlockData,
  type EmbedBlockData,
  type GalleryBlockData,
  type HeadingBlockData,
  type ImageBlockData,
  type LinksBlockData,
  type SocialsBlockData,
  type SpacerBlockData,
  type TextBlockData,
  type VideoBlockData,
  type DividerBlockData,
  videoBlockSchema,
} from "@/lib/blocks/schemas";

/**
 * The block registry.
 *
 * One entry per block type, holding everything that is true about that type
 * regardless of who is asking: its name, the sentence the "Add block" menu
 * shows, its schema, the data a fresh one starts with, and two facts the
 * editor needs — whether the page may hold more than one, and whether the
 * block reads rows from a table rather than only its own JSON.
 *
 * Deliberately free of React. The editor imports this and so does the public
 * renderer; if a component lived here, every editor form would be reachable
 * from the public page's import graph and the bundler would have no way to
 * know it was dead. Components are mapped to types in two thin lookups — one
 * per side — that both key off `BlockType`, so a missing entry is a type
 * error rather than a blank space on somebody's page.
 *
 * Adding a block type is: a value in the database enum, a schema, an entry
 * here, a renderer, an editor form. Nothing else in the application changes.
 */

export interface BlockDefinition<Data> {
  type: BlockType;
  /** Shown in the "Add block" menu and as the card's title in the editor. */
  label: string;
  /** One sentence. What a creator gets, not how it is implemented. */
  description: string;
  schema: z.ZodType<Data, unknown>;
  /** A new block of this type, before the creator has touched it. */
  defaults: () => Data;
  /**
   * Whether a page may hold more than one.
   *
   * Links sections are plural on purpose — "Latest" and "Shop" are two
   * sections. The social row is not: the platforms come from a table with one
   * row per platform, so a second block would render the same marks twice.
   */
  multiple: boolean;
  /**
   * True when the block's content lives in its own table rather than in
   * `data`. The editor uses it to decide whether deleting the block should
   * warn that rows go with it.
   */
  backedByRows: boolean;
  /** The block has nothing to configure; the editor renders no form. */
  configurable: boolean;
}

/*
 * Typed one property at a time rather than as a single mapped type: each
 * definition needs its own `Data`, and a `Record<BlockType, BlockDefinition<
 * unknown>>` would erase exactly the types the editor and renderer rely on.
 */
export interface BlockRegistry {
  links: BlockDefinition<LinksBlockData>;
  socials: BlockDefinition<SocialsBlockData>;
  text: BlockDefinition<TextBlockData>;
  heading: BlockDefinition<HeadingBlockData>;
  image: BlockDefinition<ImageBlockData>;
  image_gallery: BlockDefinition<GalleryBlockData>;
  video: BlockDefinition<VideoBlockData>;
  embed: BlockDefinition<EmbedBlockData>;
  contact: BlockDefinition<ContactBlockData>;
  divider: BlockDefinition<DividerBlockData>;
  spacer: BlockDefinition<SpacerBlockData>;
}

export const BLOCKS: BlockRegistry = {
  links: {
    type: "links",
    label: "Links",
    description: "A stack of buttons, or a grid. The heart of most pages.",
    schema: linksBlockSchema,
    defaults: () => ({ title: "", layout: "list" as const }),
    multiple: true,
    backedByRows: true,
    configurable: true,
  },
  socials: {
    type: "socials",
    label: "Socials",
    description: "A row of icons for the places people can follow you.",
    schema: socialsBlockSchema,
    defaults: () => ({}),
    multiple: false,
    backedByRows: true,
    configurable: true,
  },
  text: {
    type: "text",
    label: "Text",
    description: "An announcement, a paragraph, or a line of context.",
    schema: textBlockSchema,
    defaults: () => ({ text: "", align: "center" as const, style: "body" as const }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  heading: {
    type: "heading",
    label: "Heading",
    description: "A real section heading — “My content”, “Latest videos”.",
    schema: headingBlockSchema,
    defaults: () => ({ text: "", level: "section" as const, align: "center" as const }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  image: {
    type: "image",
    label: "Image",
    description: "One picture, optionally linked to somewhere.",
    schema: imageBlockSchema,
    defaults: () => ({ url: "", alt: "", href: null, aspect: "auto" as const }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  image_gallery: {
    type: "image_gallery",
    label: "Gallery",
    description: "Several images side by side, with an optional button.",
    schema: galleryBlockSchema,
    defaults: () => ({
      title: "",
      layout: "carousel" as const,
      items: [],
      aspect: "portrait" as const,
      cta: null,
    }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  video: {
    type: "video",
    label: "Video",
    description: "A YouTube or Vimeo video, playable on the page.",
    schema: videoBlockSchema,
    defaults: () => ({ url: "", title: "" }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  embed: {
    type: "embed",
    label: "Music",
    description: "A track, album or playlist people can play here.",
    schema: embedBlockSchema,
    defaults: () => ({ url: "", title: "" }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  contact: {
    type: "contact",
    label: "Contact",
    description: "Email, call, WhatsApp or an address — as actions, not links.",
    schema: contactBlockSchema,
    defaults: () => ({ title: "", items: [] }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  divider: {
    type: "divider",
    label: "Divider",
    description: "A quiet line between two parts of the page.",
    schema: dividerBlockSchema,
    defaults: () => ({ style: "line" as const }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
  spacer: {
    type: "spacer",
    label: "Spacer",
    description: "A gap. For when two things need to stop touching.",
    schema: spacerBlockSchema,
    defaults: () => ({ size: "medium" as const }),
    multiple: true,
    backedByRows: false,
    configurable: true,
  },
};

/** The order the "Add block" menu offers them in: most reached for first. */
export const BLOCK_MENU_ORDER: readonly BlockType[] = [
  "links",
  "image",
  "image_gallery",
  "heading",
  "text",
  "video",
  "embed",
  "socials",
  "contact",
  "divider",
  "spacer",
];

const isBlockType = (value: string): value is BlockType => value in BLOCKS;

export const blockDefinition = (type: BlockType): BlockDefinition<never> =>
  BLOCKS[type] as unknown as BlockDefinition<never>;

export const blockLabel = (type: BlockType): string => BLOCKS[type].label;

/**
 * Validate one block's data against its own schema, or reject it.
 *
 * Returns null for an unknown type or data that does not fit. The zod schemas
 * apply defaults as they parse, so a block written before a field existed
 * comes back complete rather than half-empty — which is what lets a new
 * optional setting ship without a data migration.
 */
export function parseBlockData(
  type: string,
  data: unknown,
): Record<string, unknown> | null {
  if (!isBlockType(type)) return null;

  const parsed = BLOCKS[type].schema.safeParse(data ?? {});
  return parsed.success ? (parsed.data as Record<string, unknown>) : null;
}
