/**
 * What counts as an image ShowMe will store.
 *
 * The same three rules are applied in three places, and that is deliberate:
 *
 *   · the file picker, so a phone offers photos rather than every file;
 *   · the upload action, which is the one that decides;
 *   · the Storage bucket itself, so a request that never reaches the
 *     application is still refused.
 *
 * This module is the shared vocabulary. It is client-safe — no Node APIs, no
 * `server-only` — because the browser needs it too.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** MIME type → the extension the stored object gets. */
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

export type ImageMime = keyof typeof IMAGE_TYPES;

export const ACCEPT_ATTRIBUTE = Object.keys(IMAGE_TYPES).join(",");

export const isImageMime = (value: string): value is ImageMime => value in IMAGE_TYPES;

export type UploadProblem = "empty" | "too_large" | "wrong_type" | "not_an_image";

export const UPLOAD_MESSAGES: Record<UploadProblem, string> = {
  empty: "Choose an image.",
  too_large: "That image is larger than 5 MB. Try a smaller one.",
  wrong_type: "Images only — JPEG, PNG, WebP, AVIF or GIF.",
  not_an_image: "That file is not an image.",
};

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * The file's own leading bytes, rather than the type it claims.
 *
 * `File.type` in a multipart body is a string the client chose. It is fine for
 * picking an extension once the bytes agree, and worthless as a check on its
 * own — a script named `photo.png` arrives with `image/png` on it if the
 * uploader says so. These signatures are what actually decides.
 */
const SIGNATURES: { mime: ImageMime; test: (bytes: Uint8Array) => boolean }[] = [
  {
    mime: "image/jpeg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    test: (b) => ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a",
  },
  {
    // RIFF....WEBP
    mime: "image/webp",
    test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
  {
    // ISO base media: a `ftyp` box whose brand starts with `avif` or `avis`.
    mime: "image/avif",
    test: (b) => ascii(b, 4, 8) === "ftyp" && /^avi[fs]/.test(ascii(b, 8, 12)),
  },
];

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i += 1) {
    const byte = bytes[i];
    if (byte === undefined) return "";
    out += String.fromCharCode(byte);
  }
  return out;
}

/** The type the bytes actually are, or null if they are not an image we take. */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (bytes.length < 12) return null;
  return SIGNATURES.find((signature) => signature.test(bytes))?.mime ?? null;
}
