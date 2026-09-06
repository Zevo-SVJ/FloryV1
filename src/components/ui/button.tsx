import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The button, and the link that looks like one.
 *
 * Four variants, two sizes, nothing decorative. `primary` is inverted ink
 * rather than a coloured fill — see the note at the top of `globals.css` — and
 * the signal colour stays reserved for state.
 *
 * Every one of them is `.tactile`: it takes a 2% scale under a press, for 90ms.
 * That is the entire microinteraction budget and it is not optional. A control
 * that does not move under a finger reads as a picture of a control, which is
 * most of why a web application feels unlike an application.
 *
 * Fully rounded rather than a 10px radius. A pill reads as pressable at any
 * size, which a rounded rectangle in a system full of rounded rectangles does
 * not.
 */

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md";

const base =
  "tactile inline-flex select-none items-center justify-center gap-2 rounded-pill font-medium " +
  "disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ink-inverse shadow-[var(--shadow-control)] hover:opacity-88",
  /* The one filled-accent control in the product, for the single action a
     screen is asking for. Rationed to roughly one per screen. */
  accent: "bg-accent text-accent-ink shadow-[var(--shadow-control)] hover:bg-accent-hover",
  secondary: "bg-ink/[0.06] text-ink hover:bg-ink/[0.1]",
  ghost: "text-ink-muted hover:bg-ink/[0.06] hover:text-ink",
};

/*
 * `sm` is 36px tall, which is right next to a mouse and too small under a
 * thumb. It gets a 44px floor below `md`, exactly as the navigation items do —
 * the same pattern, applied to the other thing people tap. Desktop is
 * unchanged: from `md` up the height is the 36px it always was.
 */
const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-subhead md:h-9 md:min-h-0",
  md: "h-12 px-6 text-[1.0625rem] md:h-11",
};

const classesFor = (variant: Variant, size: Size, className?: string) =>
  cn(base, variants[variant], sizes[size], className);

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: StyleProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button className={classesFor(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={classesFor(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
