import { cn } from "@/lib/utils/cn";
import type { BlockType } from "@/types/database";

/**
 * A mark per block type.
 *
 * Line icons on a single 24-unit grid, drawn to be recognised at 16px in a
 * list rather than admired at 64. They are here rather than in the registry
 * because the registry is imported by the public renderer and these are only
 * ever seen by the person editing.
 */

const PATHS: Record<BlockType, string> = {
  // Two stacked buttons, not three lines: at 16px the line version
  // was indistinguishable from the text block sitting next to it.
  links: "M4 6h16v4.5H4zM4 13.5h16V18H4z",
  socials: "M8 12a2 2 0 100-4 2 2 0 000 4Zm8-4a2 2 0 100 4 2 2 0 000-4ZM12 20a2 2 0 100-4 2 2 0 000 4Zm-2.3-6.6 4.6-2.8M9.7 14.6l4.6 2.8",
  text: "M5 6h14M5 11h14M5 16h8",
  image: "M4 5h16v14H4zM4 15l4.5-4.5 4 4L16 11l4 4M9 9.5a1 1 0 11-2 0 1 1 0 012 0Z",
  image_gallery: "M8 4h12v12H8zM4 8v12h12M12 12l2-2 2 2 2-2",
  video: "M4 6h16v12H4zM10 9.5l5 2.5-5 2.5z",
  embed: "M12 3v11.5M12 14.5a3 3 0 11-3 3M12 3l6 2.5V9l-6-2.5",
  divider: "M4 12h16",
};

export function BlockIcon({ type, className }: { type: BlockType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("h-4 w-4", className)}
    >
      <path d={PATHS[type]} />
    </svg>
  );
}
