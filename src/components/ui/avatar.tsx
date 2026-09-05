import { cn } from "@/lib/utils/cn";

/**
 * Initials in a square.
 *
 * No image. Nothing in LOCK stores an avatar yet, and a component that takes a
 * `src` it is never given is a component with an untested branch in it. When
 * profile pictures arrive, this is where they go.
 *
 * A square with the same radius as a control, not a circle: LOCK's shapes are
 * rectangular, and one circle in an interface of rectangles reads as borrowed
 * from somewhere else.
 */
export function Avatar({
  name,
  email,
  className,
}: {
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  const initials = initialsFrom(name, email);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 select-none items-center justify-center",
        "rounded-control bg-surface-sunken text-[0.6875rem] font-semibold",
        "text-ink-muted ring-1 ring-border",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/**
 * Two letters from a name, one from an address, or a dash.
 *
 * `Array.from` rather than `[0]`, because a name can begin with an emoji or an
 * astral-plane character and indexing a string by code unit splits those in
 * half — which renders as a replacement glyph rather than a letter.
 */
export function initialsFrom(name?: string | null, email?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const first = Array.from(words[0] ?? "")[0] ?? "";
    const last = Array.from(words[words.length - 1] ?? "")[0] ?? "";
    return (first + last).toUpperCase();
  }

  if (words.length === 1) {
    return Array.from(words[0] ?? "").slice(0, 2).join("").toUpperCase();
  }

  const local = (email ?? "").trim();
  if (local) return Array.from(local).slice(0, 2).join("").toUpperCase();

  return "—";
}
