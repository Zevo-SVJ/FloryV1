"use client";

/**
 * Preparing a screenshot for analysis, on the device.
 *
 * A modern phone screenshot is around 1290×2796 and two or three megabytes. The
 * model reads it at a lower resolution than that anyway, so sending the original
 * costs the person their upload bandwidth and buys nothing. This resizes to a
 * long edge the model actually uses, re-encodes as JPEG, and returns a data URL.
 *
 * The re-encode also strips metadata, which is worth having on its own: a
 * screenshot can carry a device identifier and Blink has no use for one.
 */

/** The model's own ceiling. Above this it downsamples anyway. */
const MAX_EDGE = 2000;
const QUALITY = 0.9;

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export interface PreparedImage {
  /** `data:image/jpeg;base64,…` */
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export class ImageError extends Error {}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).catch(() => loadViaElement(file));
  }
  return loadViaElement(file);
}

function loadViaElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError("That file could not be opened as an image."));
    };
    image.src = url;
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    throw new ImageError("Blink reads PNG, JPEG and WebP screenshots.");
  }

  const bitmap = await loadBitmap(file);
  const sourceWidth = "width" in bitmap ? bitmap.width : 0;
  const sourceHeight = "height" in bitmap ? bitmap.height : 0;

  if (sourceWidth < 200 || sourceHeight < 200) {
    throw new ImageError(
      "That image is too small to read. A full screenshot of the profile works best.",
    );
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new ImageError("This browser could not process the image.");

  /* A screenshot resized without smoothing turns text into aliased noise, and
     text legibility is one of the things being judged. */
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  // Screenshots have no alpha worth keeping, and JPEG has none at all.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  if ("close" in bitmap) bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new ImageError("This browser could not encode the image.");
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

  return {
    dataUrl,
    width,
    height,
    bytes: Math.floor((base64.length * 3) / 4) - padding,
  };
}
