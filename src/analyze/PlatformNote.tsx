import { cn } from "@/lib/utils";

/**
 * Platform context.
 *
 * Blink reads Instagram profiles, and saying so plainly is useful to the
 * person deciding whether to upload. It is said in words, with Blink's own
 * neutral grid glyph — deliberately not Instagram's logo, so nothing here
 * suggests this product comes from, or is endorsed by, Instagram.
 */
export function PlatformNote({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1.5",
        className,
      )}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden className="text-ink-3">
        <g fill="currentColor">
          <rect x="1" y="1" width="4" height="4" rx="1" />
          <rect x="6" y="1" width="4" height="4" rx="1" opacity="0.55" />
          <rect x="11" y="1" width="4" height="4" rx="1" opacity="0.3" />
          <rect x="1" y="6" width="4" height="4" rx="1" opacity="0.55" />
          <rect x="6" y="6" width="4" height="4" rx="1" />
          <rect x="11" y="6" width="4" height="4" rx="1" opacity="0.55" />
          <rect x="1" y="11" width="4" height="4" rx="1" opacity="0.3" />
          <rect x="6" y="11" width="4" height="4" rx="1" opacity="0.55" />
          <rect x="11" y="11" width="4" height="4" rx="1" />
        </g>
      </svg>
      <span className="text-[0.75rem] font-medium tracking-[-0.005em] text-ink-2">
        Works with Instagram profiles
      </span>
    </span>
  );
}
