/**
 * The embeds ShowMe is willing to render.
 *
 * An iframe is the most dangerous element a creator-controlled page can
 * contain: whatever loads inside it runs in a browsing context our page
 * created, and a `src` taken from user input is arbitrary code execution on a
 * showme.at address. So a URL is never rendered. It is *matched* against a
 * provider, reduced to an id, and the id is substituted into a template that
 * lives in this file.
 *
 * The consequence is that an unsupported link is refused rather than embedded,
 * which is the point. Adding a provider is one entry in `PROVIDERS`; nothing
 * else in the application changes.
 */

export type EmbedProvider = "youtube" | "vimeo" | "spotify";

export interface Embed {
  provider: EmbedProvider;
  /** Already escaped by construction: matched from a narrow character class. */
  src: string;
  title: string;
  /**
   * How tall the frame should be. `ratio` keeps a 16:9 box that scales with
   * the column; `fixed` is for players that render a fixed-height widget and
   * letterbox themselves inside anything taller.
   */
  sizing: { kind: "ratio"; ratio: number } | { kind: "fixed"; height: number };
}

interface ProviderSpec {
  provider: EmbedProvider;
  label: string;
  /** Example shown in the editor when someone has not pasted anything yet. */
  example: string;
  /**
   * Pull an id out of a parsed URL, or return null.
   *
   * Given a `URL`, not a string, so a matcher can never be fooled by something
   * that merely contains a hostname — `https://evil.example/?x=youtube.com`
   * has a hostname of `evil.example` and matches nothing.
   */
  match: (url: URL) => Embed | null;
}

/** The character classes below are the entire sanitisation story. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{6,12}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_KINDS = new Set(["track", "album", "playlist", "artist", "episode", "show"]);

const hostIs = (url: URL, ...hosts: string[]): boolean => {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return hosts.includes(host);
};

/** Path segments with the empty strings a leading or trailing slash produces. */
const segments = (url: URL): string[] => url.pathname.split("/").filter(Boolean);

const youtube: ProviderSpec = {
  provider: "youtube",
  label: "YouTube",
  example: "https://www.youtube.com/watch?v=…",
  match(url) {
    let id: string | null = null;

    if (hostIs(url, "youtu.be")) {
      id = segments(url)[0] ?? null;
    } else if (hostIs(url, "youtube.com", "m.youtube.com", "music.youtube.com")) {
      const [first, second] = segments(url);
      if (first === "watch") id = url.searchParams.get("v");
      // `/embed/ID`, `/shorts/ID` and `/live/ID` all address the same video.
      else if (first === "embed" || first === "shorts" || first === "live") id = second ?? null;
    }

    if (!id || !YOUTUBE_ID.test(id)) return null;

    return {
      provider: "youtube",
      // `youtube-nocookie` does not set tracking cookies until playback
      // begins. The creator chose to embed this; their visitor did not.
      src: `https://www.youtube-nocookie.com/embed/${id}`,
      title: "YouTube video player",
      sizing: { kind: "ratio", ratio: 16 / 9 },
    };
  },
};

const vimeo: ProviderSpec = {
  provider: "vimeo",
  label: "Vimeo",
  example: "https://vimeo.com/…",
  match(url) {
    if (!hostIs(url, "vimeo.com", "player.vimeo.com")) return null;

    const parts = segments(url);
    // `vimeo.com/123`, `player.vimeo.com/video/123`, and the
    // `vimeo.com/123/abcdef` form an unlisted video uses.
    const id = parts[0] === "video" ? parts[1] : parts[0];
    if (!id || !VIMEO_ID.test(id)) return null;

    return {
      provider: "vimeo",
      src: `https://player.vimeo.com/video/${id}`,
      title: "Vimeo video player",
      sizing: { kind: "ratio", ratio: 16 / 9 },
    };
  },
};

const spotify: ProviderSpec = {
  provider: "spotify",
  label: "Spotify",
  example: "https://open.spotify.com/track/…",
  match(url) {
    if (!hostIs(url, "open.spotify.com")) return null;

    const parts = segments(url);
    // Localized links carry a market prefix: /intl-de/track/ID.
    const offset = parts[0]?.startsWith("intl-") ? 1 : 0;
    const kind = parts[offset];
    const id = parts[offset + 1];

    if (!kind || !id || !SPOTIFY_KINDS.has(kind) || !SPOTIFY_ID.test(id)) return null;

    return {
      provider: "spotify",
      src: `https://open.spotify.com/embed/${kind}/${id}`,
      title: "Spotify player",
      /*
       * Spotify's player is a fixed-height widget, and a different height per
       * kind: a single track is a compact bar, a playlist is a scrollable
       * list. Giving a track a playlist's height leaves a band of empty green.
       */
      sizing: { kind: "fixed", height: kind === "track" || kind === "episode" ? 152 : 352 },
    };
  },
};

const PROVIDERS: readonly ProviderSpec[] = [youtube, vimeo, spotify];

/** What each block type is allowed to embed. */
export const VIDEO_PROVIDERS: readonly EmbedProvider[] = ["youtube", "vimeo"];
export const EMBED_PROVIDERS: readonly EmbedProvider[] = ["spotify"];

export function providerLabel(provider: EmbedProvider): string {
  return PROVIDERS.find((spec) => spec.provider === provider)?.label ?? provider;
}

export function providerExamples(allowed: readonly EmbedProvider[]): string[] {
  return PROVIDERS.filter((spec) => allowed.includes(spec.provider)).map(
    (spec) => spec.example,
  );
}

/**
 * Resolve a pasted URL to something renderable, or null.
 *
 * `allowed` narrows the providers a particular block accepts, so the video
 * block refuses a Spotify link with a useful message instead of quietly
 * rendering an audio player where a video was expected.
 */
export function resolveEmbed(
  input: string,
  allowed: readonly EmbedProvider[] = PROVIDERS.map((spec) => spec.provider),
): Embed | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  // Checked before the matchers, so no matcher has to remember it. A
  // `javascript:` URL whose "hostname" is empty would match nothing anyway;
  // this makes that an invariant rather than a coincidence.
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  for (const spec of PROVIDERS) {
    if (!allowed.includes(spec.provider)) continue;
    const embed = spec.match(url);
    if (embed) return embed;
  }
  return null;
}

/** The message the editor shows when nothing matched. */
export function unsupportedMessage(allowed: readonly EmbedProvider[]): string {
  const names = PROVIDERS.filter((spec) => allowed.includes(spec.provider)).map(
    (spec) => spec.label,
  );
  const list =
    names.length <= 1
      ? (names[0] ?? "a supported provider")
      : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
  return `That link is not supported. Paste a ${list} link.`;
}
