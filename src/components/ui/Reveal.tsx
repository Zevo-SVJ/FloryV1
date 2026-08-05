"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE_OUT, onceInView } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}

/** Scroll reveal with the house easing. Fires once, never on the way back. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
  duration = DURATION.base,
}: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, filter: "blur(5px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={onceInView}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Small caps label. The only decorative device in the type system. */
export function Label({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-label font-medium uppercase",
        accent ? "text-accent" : "text-ink-4",
        className,
      )}
    >
      {children}
    </p>
  );
}
