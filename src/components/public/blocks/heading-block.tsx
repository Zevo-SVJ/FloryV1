import { cn } from "@/lib/utils/cn";
import type { HeadingBlockData } from "@/lib/blocks/schemas";

/**
 * A section heading, in the document outline.
 *
 * The difference between this and the text block's "heading" style is the one
 * that matters and the one that is invisible in a screenshot: this emits a
 * real `<h2>` or `<h3>`. A screen reader user navigates a page by its
 * headings, and a paragraph in a larger font is not one of them.
 *
 * The creator's name is the page's `h1`, so "section" is `h2` and "subsection"
 * is `h3`. Those two words are what the editor offers, because "h2" is a
 * question about HTML and "a heading, or a smaller heading under one" is a
 * question about a page.
 *
 * There is no level a creator can type. A block that could emit `<h1>` would
 * be a block that could give a page two competing titles, and the text goes in
 * as a string that React escapes — no markup, here or anywhere below it.
 */
export function HeadingBlock({ data }: { data: HeadingBlockData }) {
  const alignment =
    data.align === "left"
      ? "sm-align-left"
      : data.align === "right"
        ? "sm-align-right"
        : "sm-align-center";

  const className = cn(
    data.level === "subsection" ? "sm-heading-3" : "sm-heading-2",
    alignment,
  );

  if (data.level === "subsection") {
    return <h3 className={className}>{data.text}</h3>;
  }

  return <h2 className={className}>{data.text}</h2>;
}
