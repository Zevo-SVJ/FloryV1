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
    "That link is not supported. Paste a YouTube or Vimeo link.",
  );
  assert.equal(
    unsupportedMessage(EMBED_PROVIDERS),
    "That link is not supported. Paste a Spotify link.",
  );
});
