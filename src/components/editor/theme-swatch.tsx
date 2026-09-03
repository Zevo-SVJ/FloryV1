"use client";

import { THEMES } from "@/lib/design/themes";
import { resolveDesign } from "@/lib/design/resolve";
import { cn } from "@/lib/utils/cn";
import type { ThemeId } from "@/lib/design/types";

/**
 * What a theme looks like, in eighty pixels.
 *
 * Deliberately not a rendered page. A grid of seven live previews would mount
 * seven copies of the renderer to answer a question — "is this the dark one?"
 * — that four rectangles answer instantly and for almost nothing.
 *
 * The rectangles are drawn from the theme's own resolved values rather than
 * from a hand-written thumbnail, so a swatch cannot fall out of step with the
 * theme it advertises: the background is the background, the pill is the
 * button at the button's radius, and the two bars are the text and muted
 * colours at the sizes they have on a real page.
 */
export function ThemeSwatch({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeId;
  selected: boolean;
  onSelect: () => void;
}) {
  const definition = THEMES[theme];
  const resolved = resolveDesign({ theme });
  const { colors } = resolved;

  const background =
    resolved.background.kind === "gradient" && resolved.background.gradient
      ? `linear-gradient(${resolved.background.gradient.angle}deg, ${resolved.background.gradient.from}, ${resolved.background.gradient.to})`
      : colors.background;

  const radius =
    resolved.buttonShape === "pill" ? "999px" : resolved.buttonShape === "rounded" ? "6px" : "2px";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group flex flex-col gap-2 rounded-card p-1.5 text-left transition-colors",
        selected ? "bg-surface-sunken" : "hover:bg-surface-sunken",
      )}
    >
      <span
        aria-hidden
        style={{ background }}
        className={cn(
          "flex h-20 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-control px-3 ring-1 transition-shadow",
          selected ? "ring-2 ring-accent" : "ring-border",
        )}
      >
        {/* The name, then the bio, then a button: the shape of every page. */}
        <span
          style={{ backgroundColor: colors.text }}
          className="h-1.5 w-10 rounded-full opacity-90"
        />
        <span
          style={{ backgroundColor: colors.muted }}
          className="h-1 w-14 rounded-full opacity-70"
        />
        <span
          style={{
            backgroundColor:
              resolved.buttonStyle === "filled" || resolved.buttonStyle === "soft"
                ? colors.buttonBackground
                : "transparent",
            border:
              resolved.buttonStyle === "outline" || resolved.buttonStyle === "glass"
                ? `1px solid ${colors.buttonBackground}`
                : undefined,
            borderRadius: radius,
            opacity: resolved.buttonStyle === "soft" ? 0.35 : 1,
          }}
          className="mt-0.5 h-4 w-20"
        />
      </span>

      <span className="px-0.5">
        <span className="block text-[0.8125rem] font-medium text-ink">{definition.name}</span>
        <span className="block text-[0.75rem] leading-snug text-ink-subtle">
          {definition.description}
        </span>
      </span>
    </button>
  );
}
