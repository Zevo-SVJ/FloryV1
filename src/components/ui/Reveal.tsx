"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE_OUT, inViewOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance travelled on the way in. Larger blocks move a little further. */
  y?: number;
  duration?: number;
}

/** Scroll-reveal with the house easing. Fires once, never on the way back up. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
  duration = DURATION.base,
}: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={inViewOnce}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
