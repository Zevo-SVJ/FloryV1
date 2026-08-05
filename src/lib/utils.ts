export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Deterministic 32-bit hash, so a given screenshot always scores the same. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compact social counts: 1.2k, 14.8k, 1.1m. */
export function compactCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const thousands = value / 1000;
    const shown =
      thousands < 100 ? thousands.toFixed(1).replace(/\.0$/, "") : Math.round(thousands);
    return `${shown}k`;
  }
  return `${(value / 1_000_000).toFixed(1)}m`;
}

/** 1st, 2nd, 3rd, 11th — the report says these numbers out loud. */
export function ordinal(value: number): string {
  const teens = value % 100;
  if (teens >= 11 && teens <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

/** Score bands. The only place colour carries meaning. */
export type Band = "high" | "mid" | "low";

export function bandFor(score: number): Band {
  if (score >= 78) return "high";
  if (score >= 60) return "mid";
  return "low";
}

export const BAND_LABEL: Record<Band, string> = {
  high: "Strong",
  mid: "Mixed",
  low: "Weak",
};
