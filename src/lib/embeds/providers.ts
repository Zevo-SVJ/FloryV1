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

export type EmbedProvider =
  | "youtube"
  | "vimeo"
  | "tiktok"
  | "spotify"
  | "apple_music"
  | "soundcloud";

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
/** TikTok video ids are a snowflake: nineteen digits today, room to grow. */
const TIKTOK_ID = /^[0-9]{15,21}$/;
/** One SoundCloud path segment — a user, a track, or `sets`. */
const SOUNDCLOUD_SEGMENT = /^[a-z0-9_-]{1,60}$/i;
const APPLE_COUNTRY = /^[a-z]{2}$/i;
/*
 * An id's shape depends on what it identifies, and pairing the two is what
 * keeps the matcher narrow. Apple's playlist ids are `pl.` plus a hex string;
 * everything else is numeric. Accepting either for either kind would let
 * `/us/album/x/pl.anything` through, which is not an address Apple has —
 * caught by the tests rather than reasoned about.
 */
const APPLE_NUMERIC_ID = /^[0-9]{4,15}$/;
const APPLE_PLAYLIST_ID = /^pl\.[A-Za-z0-9]{20,40}$/;
const APPLE_KINDS = new Set(["album", "playlist", "song", "artist", "station"]);
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

const tiktok: ProviderSpec = {
  provider: "tiktok",
  label: "TikTok",
  example: "https://www.tiktok.com/@name/video/…",
  match(url) {
    if (!hostIs(url, "tiktok.com", "m.tiktok.com")) return null;

    const parts = segments(url);
    /*
     * `/@handle/video/ID` and `/@handle/photo/ID`. A `vm.tiktok.com` short
     * link is deliberately refused: resolving one means this server following
     * a redirect chain on a creator's behalf, which is a request to an
     * arbitrary address decided by somebody else — and the editor can say
     * "paste the full link" instead, in front of the person who pasted it.
     */
    const at = parts.findIndex((part) => part === "video" || part === "photo");
    const id = at === -1 ? null : (parts[at + 1] ?? null);
    if (!id || !TIKTOK_ID.test(id)) return null;

    return {
      provider: "tiktok",
      src: `https://www.tiktok.com/embed/v2/${id}`,
      title: "TikTok video player",
      /*
       * Fixed, not a ratio. TikTok's frame is a vertical video plus a caption,
       * a follow button and a comment count, and the chrome does not scale
       * with the video — a 9:16 box leaves the player letterboxed inside it at
       * every width. 740px is the height TikTok's own embed uses.
       */
      sizing: { kind: "fixed", height: 740 },
    };
  },
};

const appleMusic: ProviderSpec = {
  provider: "apple_music",
  label: "Apple Music",
  example: "https://music.apple.com/us/album/…",
  match(url) {
    if (!hostIs(url, "music.apple.com", "embed.music.apple.com")) return null;

    const parts = segments(url);
    const [country, kind, , id] = parts;
    if (!country || !APPLE_COUNTRY.test(country)) return null;
    if (!kind || !APPLE_KINDS.has(kind)) return null;
    if (!id) return null;
    if (kind === "playlist" ? !APPLE_PLAYLIST_ID.test(id) : !APPLE_NUMERIC_ID.test(id)) {
      return null;
    }

    /*
     * The slug between the kind and the id is a human-readable album name and
     * is not reproduced: Apple ignores it, and it is the one segment of the
     * path a creator could put anything into. The embed is addressed by
     * country, kind and id, all three of which passed a character class above.
     */
    const track = url.searchParams.get("i");
    const song = track && /^[0-9]{4,15}$/.test(track) ? `?i=${track}` : "";

    return {
      provider: "apple_music",
      src: `https://embed.music.apple.com/${country.toLowerCase()}/${kind}/${id}${song}`,
      title: "Apple Music player",
      // A single song is a compact bar; an album or playlist is a track list.
      sizing: { kind: "fixed", height: kind === "song" || song ? 175 : 450 },
    };
  },
};

const soundcloud: ProviderSpec = {
  provider: "soundcloud",
  label: "SoundCloud",
  example: "https://soundcloud.com/artist/track",
  match(url) {
    if (!hostIs(url, "soundcloud.com", "m.soundcloud.com")) return null;

    /*
     * SoundCloud's player takes the track's own page URL as a parameter rather
     * than an id. That is the one embed here whose `src` contains a URL, so
     * the URL is rebuilt from segments this function validated — not passed
     * through from what the creator typed. Every segment matches
     * `[a-z0-9_-]`, the host is `soundcloud.com` because we write it, and the
     * result is percent-encoded into the parameter.
     */
    const parts = segments(url);
    if (parts.length < 2 || parts.length > 3) return null;
    if (!parts.every((part) => SOUNDCLOUD_SEGMENT.test(part))) return null;
    // Three segments is only meaningful as a set: /user/sets/name.
    if (parts.length === 3 && parts[1] !== "sets") return null;

    const page = `https://soundcloud.com/${parts.join("/")}`;
    const src =
      "https://w.soundcloud.com/player/?url=" +
      encodeURIComponent(page) +
      "&color=%23000000&visual=false&show_comments=false&hide_related=true";

    return {
      provider: "soundcloud",
      src,
      title: "SoundCloud player",
      sizing: { kind: "fixed", height: parts[1] === "sets" ? 320 : 166 },
    };
  },
};

const PROVIDERS: readonly ProviderSpec[] = [
  youtube,
  vimeo,
  tiktok,
  spotify,
  appleMusic,
  soundcloud,
];

/**
 * What each block type is allowed to embed.
 *
 * Twitch is deliberately absent, and the reason is worth writing down so it is
 * not mistaken for an oversight. A Twitch player refuses to load unless its
 * `parent` parameter matches the hostname serving the page, which means the
 * frame source depends on where the app is deployed — and the editor's preview
 * renders the same component in the browser, where the deployment hostname is
 * not reliably known. An embed that works in production and silently fails in
 * the preview is worse than a link.
 */
export const VIDEO_PROVIDERS: readonly EmbedProvider[] = ["youtube", "vimeo", "tiktok"];
export const EMBED_PROVIDERS: readonly EmbedProvider[] = [
  "spotify",
  "apple_music",
  "soundcloud",
];

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
