"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ScoreDialProps {
  value: number;
  size?: number;
  thickness?: number;
  /** Fill begins when true, letting the report reveal in order. */
  active?: boolean;
  delay?: number;
  duration?: number;
  children?: ReactNode;
  className?: string;
  label?: string;
}

/**
 * The only chart in the product.
 *
 * A hairline track and one arc, drawn from twelve o'clock, decelerating into its
 * value. One colour throughout — a green-amber-red scale would turn a report
 * into a dashboard, and the number plus the arc length already say everything a
 * traffic light would.
 */
export function ScoreDial({
  value,
  size = 72,
  thickness = 3,
  active = true,
  delay = 0,
  duration = 1.5,
  children,
  className,
  label,
}: ScoreDialProps) {
  const reduced = useReducedMotionSafe();
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
          className="stroke-edge"
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
            strokeDashoffset: active ? circumference * (1 - target) : circumference,
          }}
          transition={reduced ? { duration: 0 } : { duration, delay, ease: EASE_OUT }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>

      {label ? (
        <span className="sr-only">{`${label}: ${value} out of 100`}</span>
      ) : null}
    </div>
  );
}

/** The same idea flattened — used in dense lists where a dial would crowd. */
export function ScoreBar({
  value,
  active = true,
  delay = 0,
  className,
}: {
  value: number;
  active?: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={cn("h-[3px] w-full overflow-hidden rounded-full bg-edge", className)}>
      <motion.div
        className="brand-gradient h-full rounded-full"
        initial={{ width: "0%" }}
        animate={{ width: active ? `${value}%` : "0%" }}
        transition={{ duration: 1.1, delay, ease: EASE_OUT }}
      />
    </div>
  );
}
