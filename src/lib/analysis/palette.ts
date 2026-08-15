"use client";

/**
 * The screenshot's own colours, sampled in the browser.
 *
 * During the colour stage the analysis shows four swatches lifted off the
 * uploaded image. They are real — a coarse quantisation of the pixels actually
 * on screen — rather than an illustration of sampling. The model does its own,
 * better version of this for the report; this exists so the thing the person is
 * watching is true.
 */

const BUCKETS = 4; // per channel, so 64 bins
const SAMPLE_EDGE = 96;

const toHex = (value: number) => value.toString(16).padStart(2, "0");

export async function dominantColours(source: string, count = 4): Promise<string[]> {
  if (typeof document === "undefined" || !source) return [];

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = source;
  });
  if (!image) return [];

  const scale = SAMPLE_EDGE / Math.max(image.naturalWidth, image.naturalHeight, 1);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(image, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, width, height).data;
  } catch {
    return [];
  }

  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  const step = 256 / BUCKETS;

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index]!;
    const g = pixels[index + 1]!;
    const b = pixels[index + 2]!;
    const alpha = pixels[index + 3]!;
    if (alpha < 200) continue;

    const key =
      Math.floor(r / step) * BUCKETS * BUCKETS +
      Math.floor(g / step) * BUCKETS +
      Math.floor(b / step);

    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bin.count += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }

  return [...bins.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map(
      (bin) =>
        `#${toHex(Math.round(bin.r / bin.count))}${toHex(
          Math.round(bin.g / bin.count),
        )}${toHex(Math.round(bin.b / bin.count))}`,
    );
}
