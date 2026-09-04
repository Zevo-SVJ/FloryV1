import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * The wordmark.
 *
 * Set in the monospace, spaced out, in ink. No glyph, no gradient, no padlock —
 * a symbol drawn before the product has a personality is a symbol that gets
 * replaced. The name is strong enough on its own, and this is one line to
 * change when there is a real mark.
 */
export function LockMark({
  href,
  className,
}: {
  /** Renders as a link when given a destination, plain text otherwise. */
  href?: string;
  className?: string;
}) {
  const classes = cn(
    "font-mono text-[0.9375rem] font-semibold tracking-[0.22em] text-ink",
    className,
  );

  if (!href) return <span className={classes}>LOCK</span>;

  return (
    <Link href={href} className={classes}>
      LOCK
    </Link>
  );
}
