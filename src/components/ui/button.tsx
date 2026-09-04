import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The button, and the link that looks like one.
 *
 * Three variants, two sizes, nothing decorative. `primary` is inverted ink
 * rather than a coloured fill — see the note at the top of `globals.css` — and
 * the signal colour stays reserved for state.
 */

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-control font-medium " +
  "transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ink-inverse shadow-control hover:opacity-90",
  secondary:
    "bg-surface text-ink ring-1 ring-border-strong shadow-control hover:bg-surface-sunken",
  ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
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
