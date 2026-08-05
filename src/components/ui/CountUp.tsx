"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  /** Counting starts when this flips true, so it can follow choreography. */
  active?: boolean;
  from?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
}

/**
 * A number that arrives rather than appears.
 *
 * Driven by a motion value, so the DOM text updates per frame without
 * re-rendering React — this stays smooth with a dozen on screen at once.
 */
export function CountUp({
  value,
  active = true,
  from = 0,
  duration = DURATION.epic,
  delay = 0,
  decimals = 0,
  className,
}: CountUpProps) {
  const reduced = useReducedMotionSafe();
  const progress = useMotionValue(from);
  const text = useTransform(progress, (latest) => latest.toFixed(decimals));

  useEffect(() => {
    if (!active) {
      progress.set(from);
      return;
    }

    if (reduced) {
      progress.set(value);
      return;
    }

    const controls = animate(progress, value, { duration, delay, ease: EASE_OUT });
    return () => controls.stop();
  }, [active, delay, duration, from, progress, reduced, value]);

  return <motion.span className={cn("tabular", className)}>{text}</motion.span>;
}
