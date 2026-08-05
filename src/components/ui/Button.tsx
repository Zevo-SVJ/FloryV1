"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "quiet";
type Size = "md" | "lg";

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Slides right by 2px on hover — the press feels like it goes somewhere. */
  trailing?: ReactNode;
  disabled?: boolean;
}

interface ButtonAsButton extends BaseProps {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  ariaLabel?: string;
}

interface ButtonAsLink extends BaseProps {
  href: string;
  onClick?: () => void;
  ariaLabel?: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "group relative inline-flex select-none items-center justify-center gap-2.5 rounded-full font-medium tracking-[-0.01em] transition-colors will-change-transform disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-deep shadow-lift",
  outline:
    "border border-line-strong bg-surface text-ink hover:border-ink/40 hover:bg-white",
  quiet: "text-ink/70 hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 px-7 text-[1.0625rem]",
};

const interaction = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985, y: 0 },
  transition: { duration: DURATION.micro, ease: EASE_OUT },
} as const;

export function Button(props: ButtonProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    className,
    trailing,
    disabled,
    ariaLabel,
  } = props;

  const classes = cn(base, variants[variant], sizes[size], className);

  const content = (
    <>
      <span>{children}</span>
      {trailing ? (
        <span className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">
          {trailing}
        </span>
      ) : null}
    </>
  );

  if (props.href !== undefined) {
    return (
      <motion.a
        href={props.href}
        onClick={props.onClick}
        className={classes}
        aria-label={ariaLabel}
        {...interaction}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
      {...interaction}
    >
      {content}
    </motion.button>
  );
}
