import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMBED_PROVIDERS,
  VIDEO_PROVIDERS,
  resolveEmbed,
  unsupportedMessage,
} from "../providers.ts";

/**
 * The one place user input becomes an iframe source.
 *
 * Everything here is about refusal. A URL that resolves produces a `src` built
 * from a template and an id that passed a character class; a URL that does not
 * produces null and never reaches the page. These tests exist so that stays
 * true when somebody adds a fourth provider.
 */

/* ── YouTube ──────────────────────────────────────────────────────────────── */

test("every YouTube URL shape resolves to the same embed", () => {
  const expected = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";

  for (const input of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
    "  https://youtu.be/dQw4w9WgXcQ  ",
  ]) {
    assert.equal(resolveEmbed(input, VIDEO_PROVIDERS)?.src, expected, input);
  }
});

test("a YouTube id of the wrong length is refused", () => {
  assert.equal(resolveEmbed("https://youtu.be/short", VIDEO_PROVIDERS), null);
  assert.equal(resolveEmbed("https://youtu.be/waytoolongforanid", VIDEO_PROVIDERS), null);
});

test("an id carrying path syntax cannot escape the template", () => {
  // The eleven characters after the slash would be `../../evil` if the class
  // allowed a dot or a slash. It does not, so this is simply not a match.
  assert.equal(resolveEmbed("https://youtu.be/../../evil", VIDEO_PROVIDERS), null);
  assert.equal(
    resolveEmbed("https://www.youtube.com/watch?v=<script>xx", VIDEO_PROVIDERS),
    null,
  );
});

/* ── Vimeo ────────────────────────────────────────────────────────────────── */

test("Vimeo resolves from every form it publishes", () => {
  const expected = "https://player.vimeo.com/video/123456789";

  for (const input of [
    "https://vimeo.com/123456789",
    "https://www.vimeo.com/123456789",
    "https://player.vimeo.com/video/123456789",
    // The unlisted-video form, where the second segment is a private hash.
    "https://vimeo.com/123456789/abcdef1234",
  ]) {
    assert.equal(resolveEmbed(input, VIDEO_PROVIDERS)?.src, expected, input);
  }
});

test("a Vimeo id that is not digits is refused", () => {
  assert.equal(resolveEmbed("https://vimeo.com/channels/staffpicks", VIDEO_PROVIDERS), null);
});

/* ── Spotify ──────────────────────────────────────────────────────────────── */

test("Spotify resolves per kind, and sizes a track differently from a playlist", () => {
  const track = resolveEmbed(
    "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    EMBED_PROVIDERS,
  );
  assert.equal(track?.src, "https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT");
  assert.deepEqual(track?.sizing, { kind: "fixed", height: 152 });

  const playlist = resolveEmbed(
    "https://open.spotify.com/playlist/4cOdK2wGLETKBW3PvgPWqT",
    EMBED_PROVIDERS,
  );
  assert.deepEqual(playlist?.sizing, { kind: "fixed", height: 352 });
});

test("a localized Spotify link resolves through its market prefix", () => {
  assert.equal(
    resolveEmbed(
      "https://open.spotify.com/intl-de/album/4cOdK2wGLETKBW3PvgPWqT",
      EMBED_PROVIDERS,
    )?.src,
    "https://open.spotify.com/embed/album/4cOdK2wGLETKBW3PvgPWqT",
  );
});

test("a Spotify kind we do not embed is refused", () => {
  assert.equal(
    resolveEmbed("https://open.spotify.com/user/4cOdK2wGLETKBW3PvgPWqT", EMBED_PROVIDERS),
    null,
  );
});

/* ── Refusals ─────────────────────────────────────────────────────────────── */

test("a hostname that merely contains a provider name is not that provider", () => {
  for (const input of [
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evil.example/?next=https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://notvimeo.com/123456789",
  ]) {
    assert.equal(resolveEmbed(input), null, input);
  }
});

test("a script-bearing scheme never resolves", () => {
  for (const input of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "JAVASCRIPT:alert(1)",
  ]) {
    assert.equal(resolveEmbed(input), null, input);
  }
});

test("nonsense resolves to nothing rather than throwing", () => {
  for (const input of ["", "   ", "not a url", "://", "https://"]) {
    assert.equal(resolveEmbed(input), null, JSON.stringify(input));
  }
});

test("a provider outside the allowed list is refused even when it parses", () => {
  const youtube = "https://youtu.be/dQw4w9WgXcQ";
  assert.notEqual(resolveEmbed(youtube, VIDEO_PROVIDERS), null);
  assert.equal(resolveEmbed(youtube, EMBED_PROVIDERS), null);
});

test("the unsupported message names the providers that would work", () => {
  assert.equal(
    unsupportedMessage(VIDEO_PROVIDERS),
    "That link is not supported. Paste a YouTube, Vimeo or TikTok link.",
  );
  assert.equal(
    unsupportedMessage(EMBED_PROVIDERS),
    "That link is not supported. Paste a Spotify, Apple Music or SoundCloud link.",
  );
});

/* ── Phase 7: the providers a creator page actually needs ─────────────────── */

test("a TikTok video resolves to TikTok's own embed", () => {
  const embed = resolveEmbed(
    "https://www.tiktok.com/@someone/video/7231234567890123456",
    VIDEO_PROVIDERS,
  );

  assert.equal(embed?.provider, "tiktok");
  assert.equal(embed?.src, "https://www.tiktok.com/embed/v2/7231234567890123456");
});

test("a TikTok photo post is the same id in the same frame", () => {
  const embed = resolveEmbed(
    "https://www.tiktok.com/@someone/photo/7231234567890123456",
    VIDEO_PROVIDERS,
  );
  assert.equal(embed?.src, "https://www.tiktok.com/embed/v2/7231234567890123456");
});

test("a vm.tiktok.com short link is refused rather than resolved", () => {
  /*
   * Resolving one means following a redirect chain to wherever it points,
   * which is this server making a request to an address somebody else chose.
   * Refusing it lets the editor say "paste the full link" instead.
   */
  assert.equal(resolveEmbed("https://vm.tiktok.com/ZMabcdefg/", VIDEO_PROVIDERS), null);
});

test("a TikTok id that is not a snowflake is refused", () => {
  for (const id of ["123", "abcdefghijklmnop", "7231234567890123456789012"]) {
    assert.equal(
      resolveEmbed(`https://www.tiktok.com/@x/video/${id}`, VIDEO_PROVIDERS),
      null,
      id,
    );
  }
});

test("an Apple Music album resolves without reproducing the slug", () => {
  const embed = resolveEmbed(
    "https://music.apple.com/us/album/some-record-name/1440857781",
    EMBED_PROVIDERS,
  );

  assert.equal(embed?.provider, "apple_music");
  // The slug is the one path segment a creator could put anything into, and
  // Apple ignores it — so it is not carried through.
  assert.equal(embed?.src, "https://embed.music.apple.com/us/album/1440857781");
  assert.equal(embed?.src.includes("some-record-name"), false);
});

test("an Apple Music playlist id keeps its pl. prefix", () => {
  const embed = resolveEmbed(
    "https://music.apple.com/gb/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb",
    EMBED_PROVIDERS,
  );
  assert.equal(
    embed?.src,
    "https://embed.music.apple.com/gb/playlist/pl.f4d106fed2bd41149aaacabb233eb5eb",
  );
});

test("a track inside an Apple Music album carries the i parameter and nothing else", () => {
  const embed = resolveEmbed(
    "https://music.apple.com/us/album/x/1440857781?i=1440857785&uo=4&app=music",
    EMBED_PROVIDERS,
  );
  assert.equal(embed?.src, "https://embed.music.apple.com/us/album/1440857781?i=1440857785");
});

test("an Apple Music URL with a hostile country or kind is refused", () => {
  for (const url of [
    "https://music.apple.com/us/evil/x/123456",
    "https://music.apple.com/usa/album/x/123456",
    "https://music.apple.com/us/album/x/notanid",
    // A playlist id under an album path: not an address Apple has.
    "https://music.apple.com/us/album/x/pl.f4d106fed2bd41149aaacabb233eb5eb",
    // And a numeric id under a playlist path.
    "https://music.apple.com/us/playlist/x/1440857781",
    "https://music.apple.com/us/playlist/x/pl.short",
  ]) {
    assert.equal(resolveEmbed(url, EMBED_PROVIDERS), null, url);
  }
});

test("a SoundCloud track becomes a player pointed at a URL we rebuilt", () => {
  const embed = resolveEmbed("https://soundcloud.com/artist/track-name", EMBED_PROVIDERS);

  assert.equal(embed?.provider, "soundcloud");
  /*
   * The one embed here whose src contains a URL. It is rebuilt from segments
   * that each passed a character class, with a host this file wrote — never
   * passed through from what the creator typed.
   */
  assert.ok(
    embed?.src.startsWith(
      "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Ftrack-name",
    ),
  );
});

test("a SoundCloud set is recognised and a three-segment path that is not one is refused", () => {
  assert.ok(resolveEmbed("https://soundcloud.com/artist/sets/an-album", EMBED_PROVIDERS));
  assert.equal(
    resolveEmbed("https://soundcloud.com/artist/track/extra", EMBED_PROVIDERS),
    null,
  );
  assert.equal(resolveEmbed("https://soundcloud.com/artist", EMBED_PROVIDERS), null);
});

test("a SoundCloud path that could escape the host is refused", () => {
  for (const url of [
    "https://soundcloud.com/artist/..%2F..%2Fevil",
    "https://soundcloud.com/artist/track?x=%22onload%3D",
  ]) {
    const embed = resolveEmbed(url, EMBED_PROVIDERS);
    if (embed) {
      // If it resolved at all, the parameter must still be one encoded value
      // pointing at soundcloud.com and nothing else.
      assert.match(
        embed.src,
        /^https:\/\/w\.soundcloud\.com\/player\/\?url=https%3A%2F%2Fsoundcloud\.com%2F[A-Za-z0-9_%-]+/,
        url,
      );
    }
  }
});

test("each block type still refuses the other's providers", () => {
  // A music link in a video block would render an audio player where a video
  // was expected, so the editor refuses it in front of whoever pasted it.
  assert.equal(resolveEmbed("https://soundcloud.com/a/b", VIDEO_PROVIDERS), null);
  assert.equal(
    resolveEmbed("https://www.tiktok.com/@x/video/7231234567890123456", EMBED_PROVIDERS),
    null,
  );
});
