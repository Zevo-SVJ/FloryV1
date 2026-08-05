"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: ReactNode;
  /** Pixels per second. Lower reads calmer. */
  speed?: number;
  direction?: "left" | "right";
  className?: string;
  label?: string;
}

/**
 * An infinite rail.
 *
 * The row is rendered twice and wrapped at exactly half its width, so the seam
 * always lands on an identical frame and the loop is invisible. Driven per
 * frame rather than by a keyframe animation, which is what makes it pausable:
 * hovering to read a card stops the rail under the cursor instead of fighting
 * it. With reduced motion it degrades to an ordinary swipeable rail.
 */
export function Marquee({
  children,
  speed = 34,
  direction = "left",
  className,
  label,
}: MarqueeProps) {
  const reduced = useReducedMotionSafe();
  const rowRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [half, setHalf] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;

    const measure = () => setHalf(element.scrollWidth / 2);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  useEffect(() => {
    // Start the reverse rail already shifted, so both directions are seamless.
    if (direction === "right" && half > 0) x.set(-half);
  }, [direction, half, x]);

  useAnimationFrame((_, delta) => {
    if (paused.current || half <= 0 || reduced) return;

    const step = (speed * delta) / 1000;
    let next = direction === "left" ? x.get() - step : x.get() + step;

    if (next <= -half) next += half;
    if (next >= 0) next -= half;

    x.set(next);
  });

  if (reduced) {
    return (
      <div
        className={cn("no-bar w-full overflow-x-auto", className)}
        aria-label={label}
      >
        <div className="flex w-max items-stretch gap-4 px-5">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      aria-label={label}
      onPointerEnter={() => {
        paused.current = true;
      }}
      onPointerLeave={() => {
        paused.current = false;
      }}
    >
      <motion.div
        ref={rowRef}
        className="flex w-max items-stretch gap-4 will-change-transform"
        style={{ x }}
      >
        {children}
        {children}
      </motion.div>

      {/* The rail runs off both edges rather than stopping at a hard border. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-canvas to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-canvas to-transparent sm:w-28" />
    </div>
  );
}
