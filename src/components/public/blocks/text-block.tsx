import { cn } from "@/lib/utils/cn";
import type { TextBlockData } from "@/lib/blocks/schemas";

/**
 * Words on the page.
 *
 * The text arrives as a string and is placed as a string. React escapes it, and
 * there is no `dangerouslySetInnerHTML` in this file or anywhere below it —
 * which is the whole reason the editor offers two styles rather than a rich
 * text field. A creator who could write markup would be writing markup into
 * somebody else's browser.
 *
 * `white-space: pre-line` in the stylesheet preserves the line breaks somebody
 * typed without preserving the accidental double spaces that come with them.
 * It is the difference between a three-line announcement rendering as three
 * lines and rendering as one paragraph.
 */
export function TextBlock({ data }: { data: TextBlockData }) {
  const alignment = data.align === "left" ? "sm-align-left" : "sm-align-center";

  if (data.style === "heading") {
    return <h2 className={cn("sm-text-heading", alignment)}>{data.text}</h2>;
  }

  return <p className={cn("sm-text", alignment)}>{data.text}</p>;
}
