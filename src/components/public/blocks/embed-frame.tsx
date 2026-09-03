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
 */
export function EmbedFrame({ embed, title }: { embed: Embed; title: string }) {
  const named = title.trim();

  const frame = (
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
  );

  return (
    <section aria-label={named.length > 0 ? named : embed.title}>
      <SectionTitle>{named}</SectionTitle>

      <div
        className="relative overflow-hidden rounded-card bg-surface-sunken"
        style={
          embed.sizing.kind === "ratio"
            ? { aspectRatio: String(embed.sizing.ratio) }
            : { height: `${embed.sizing.height}px` }
        }
      >
        {frame}
      </div>
    </section>
  );
}
