"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
  /** Fills its container — used inside the upload sheet on mobile. */
  block?: boolean;
}

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-[-0.012em] transition-colors disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#191b21] shadow-rest",
  secondary:
    "bg-white text-ink ring-1 ring-edge-strong hover:ring-ink/25 shadow-rest",
  ghost: "text-ink-2 hover:text-ink hover:bg-sunken",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.875rem]",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-[3.25rem] px-7 text-[1rem]",
};

/**
 * The one button.
 *
 * Ink-filled for the action that matters, white-on-hairline for everything
 * else. Press is a 1.5% scale and a 1px settle — enough to feel mechanical
 * without looking springy.
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  leading,
  trailing,
  disabled,
  type = "button",
  ariaLabel,
  block,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985, y: 0 }}
      transition={{ duration: DURATION.tap, ease: EASE_OUT }}
    >
      {leading}
      <span>{children}</span>
      {trailing ? (
        <span className="transition-transform duration-300 ease-out group-hover:translate-x-[2px]">
          {trailing}
        </span>
      ) : null}
    </motion.button>
  );
}
