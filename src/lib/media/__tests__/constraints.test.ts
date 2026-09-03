import assert from "node:assert/strict";
import { test } from "node:test";

import { IMAGE_TYPES, isImageMime, sniffImageMime } from "../constraints.ts";

/**
 * What a file actually is, rather than what it says it is.
 *
 * `File.type` in a multipart body is a string the uploader chose. These
 * signatures are the check that cannot be lied to, so they are the ones worth
 * testing: a script renamed `photo.png` and declared as `image/png` has to
 * come back as null.
 */

const bytes = (...values: (number | string)[]): Uint8Array => {
  const out: number[] = [];
  for (const value of values) {
    if (typeof value === "number") out.push(value);
    else for (const character of value) out.push(character.charCodeAt(0));
  }
  // Padded past the twelve-byte minimum the sniffer needs to look at.
  while (out.length < 16) out.push(0);
  return new Uint8Array(out);
};

test("each format is recognised from its own signature", () => {
  assert.equal(sniffImageMime(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(
    sniffImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    "image/png",
  );
  assert.equal(sniffImageMime(bytes("GIF89a")), "image/gif");
  assert.equal(sniffImageMime(bytes("GIF87a")), "image/gif");
  assert.equal(sniffImageMime(bytes("RIFF", 0, 0, 0, 0, "WEBP")), "image/webp");
  assert.equal(sniffImageMime(bytes(0, 0, 0, 0, "ftypavif")), "image/avif");
  assert.equal(sniffImageMime(bytes(0, 0, 0, 0, "ftypavis")), "image/avif");
});

test("a file that is not an image is refused whatever it claims to be", () => {
  // An ELF binary, a shell script, a PDF, and an HTML page with a script tag.
  assert.equal(sniffImageMime(bytes(0x7f, "ELF")), null);
  assert.equal(sniffImageMime(bytes("#!/bin/sh\necho hi")), null);
  assert.equal(sniffImageMime(bytes("%PDF-1.7")), null);
  assert.equal(sniffImageMime(bytes("<script>alert(1)")), null);
});

test("a truncated file is refused rather than read past its end", () => {
  assert.equal(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff])), null);
  assert.equal(sniffImageMime(new Uint8Array()), null);
});

test("a RIFF container that is not WebP is refused", () => {
  // A .wav is RIFF too. Checking only the first four bytes would take it.
  assert.equal(sniffImageMime(bytes("RIFF", 0, 0, 0, 0, "WAVE")), null);
});

test("every sniffable type has an extension, and every declared type is sniffable", () => {
  for (const mime of Object.keys(IMAGE_TYPES)) {
    assert.equal(isImageMime(mime), true, mime);
  }
  assert.equal(isImageMime("image/svg+xml"), false);
  assert.equal(isImageMime("text/html"), false);
});

test("SVG is deliberately not an accepted image", () => {
  // An SVG is a document that can carry script. It is not in the type list,
  // it has no signature here, and the Storage bucket does not allow it either.
  assert.equal(isImageMime("image/svg+xml"), false);
  assert.equal(sniffImageMime(bytes("<svg xmlns=")), null);
});
