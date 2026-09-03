import { SectionTitle } from "@/components/public/section-title";
import type { Embed } from "@/lib/embeds/providers";

/**
 * The one iframe on the page, and everything that makes it safe.
 *
 * `src` never comes from a creator. It is built in `lib/embeds/providers.ts`
 * by matching a pasted URL against a known host, extracting an id that passed a
 * narrow character class, and substituting that id into a template written by
 * us. A link that does not match is refused in the editor and dropped by the
 * renderer, so there is no path from user input to an arbitrary frame source.
 *
 * `sandbox` is the second layer. The embed gets scripts, its own origin, and
 * the presentation API it needs for fullscreen — and not `allow-top-navigation`,
 * which is what would let a compromised player redirect the whole page out from
 * under a visitor.
 *
 * `title` is required on an iframe: without one a screen reader announces
 * "frame" and nothing else. The creator's own title is used when they gave one,
 * because "YouTube video player" three times in a row tells nobody which video
 * is which.
 *
 * The frame takes the page's block radius through `.sm-media` and nothing else
 * from the design. A theme may not change an aspect ratio, add padding inside
 * a player, or otherwise reach into somebody else's document.
 */
export function EmbedFrame({ embed, title }: { embed: Embed; title: string }) {
  const named = title.trim();

  return (
    <section aria-label={named.length > 0 ? named : embed.title}>
      <SectionTitle>{named}</SectionTitle>

      <div
        className="sm-media relative"
        style={
          embed.sizing.kind === "ratio"
            ? { aspectRatio: String(embed.sizing.ratio) }
            : { height: `${embed.sizing.height}px` }
        }
      >
        <iframe
          src={embed.src}
          title={named.length > 0 ? named : embed.title}
          loading="lazy"
          // Not `allow-top-navigation`, and not `allow-downloads`.
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </section>
  );
}
