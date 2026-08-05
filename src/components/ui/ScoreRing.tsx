"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  value: number;
  size?: number;
  thickness?: number;
  /** Fill only begins once true, letting the report reveal in order. */
  active?: boolean;
  delay?: number;
  duration?: number;
  /** Rendered inside the ring. Defaults to the counting value. */
  children?: React.ReactNode;
  className?: string;
  trackClassName?: string;
  label?: string;
}

/**
 * The one chart in the product.
 *
 * A hairline track, a single accent arc, and a number that counts with it.
 * The arc is drawn from 12 o'clock and eases out, so it decelerates into
 * its final value instead of snapping.
 */
export function ScoreRing({
  value,
  size = 76,
  thickness = 2,
  active = true,
  delay = 0,
  duration = 1.5,
  children,
  className,
  trackClassName,
  label,
}: ScoreRingProps) {
  const reduced = useReducedMotion();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(100, value)) / 100;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className={cn("stroke-line", trackClassName)}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: active
              ? circumference * (1 - target)
              : circumference,
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration, delay, ease: EASE_OUT }
          }
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span className="text-[0.9375rem] font-medium tracking-tight">
            <CountUp value={value} active={active} delay={delay} duration={duration} />
          </span>
        )}
      </div>

      {label ? <span className="sr-only">{`${label}: ${value} out of 100`}</span> : null}
    </div>
  );
}
