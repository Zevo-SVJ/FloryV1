import type { Device } from "@/lib/analytics/types";

/**
 * Which kind of screen this is, and nothing more.
 *
 * The user-agent string is read and thrown away. What is stored is one of four
 * words — a full UA is a high-entropy value that identifies a visitor far
 * better than it describes a device, and a creator has no use for it.
 *
 * Tablets are checked before phones because almost every tablet UA also
 * contains "Android" or a mobile token, and the specific signal has to win.
 * iPadOS 13+ reports itself as a Macintosh, which is genuinely undetectable
 * from the UA alone; those land in Desktop, which is the documented limit of
 * this approach and not worth a fingerprinting library to fix.
 */

const TABLET = /\b(ipad|tablet|playbook|silk)\b|android(?!.*\bmobile\b)/i;
const MOBILE = /\b(iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini|iemobile|mobile safari)\b/i;
const DESKTOP = /\b(windows nt|macintosh|x11|linux|cros)\b/i;

export function detectDevice(userAgent: string | null | undefined): Device {
  const ua = userAgent?.trim();
  if (!ua) return "unknown";

  if (TABLET.test(ua)) return "tablet";
  if (MOBILE.test(ua)) return "mobile";
  if (DESKTOP.test(ua)) return "desktop";
  return "unknown";
}
