import { cn } from "@/lib/utils";

/**
 * A person, drawn.
 *
 * No image files: a soft two-stop wash plus a shoulders-and-head silhouette,
 * tinted from a fixed palette. It reads as a photo at 36px, stays crisp at any
 * size, and costs nothing to load.
 */

const TINTS: { from: string; to: string; figure: string }[] = [
  { from: "#E7EAF2", to: "#C9D0E2", figure: "#8B93A8" },
  { from: "#EFE9E4", to: "#DCCFC4", figure: "#A08D7D" },
  { from: "#E4EDEA", to: "#C6DAD3", figure: "#7E9A91" },
  { from: "#ECE8F2", to: "#D5CDE4", figure: "#948AAC" },
  { from: "#F1EAE6", to: "#E0CDC6", figure: "#A88C82" },
  { from: "#E6EDF3", to: "#C8D8E6", figure: "#82949F" },
];

export function PersonAvatar({
  tint = 0,
  size = 40,
  className,
}: {
  tint?: number;
  size?: number;
  className?: string;
}) {
  const palette = TINTS[tint % TINTS.length] ?? TINTS[0]!;
  const id = `av-${tint}`;

  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>
        </defs>
        <rect width="48" height="48" fill={`url(#${id})`} />
        <path
          d="M6 48c1.6-10.6 8.4-15.4 18-15.4S40.4 37.4 42 48z"
          fill={palette.figure}
          opacity="0.9"
        />
        <circle cx="24" cy="19.5" r="9.2" fill={palette.figure} />
      </svg>
    </span>
  );
}
