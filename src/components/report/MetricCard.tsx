"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { Metric } from "@/types/report";

interface MetricCardProps {
  metric: Metric;
  index: number;
  /** The card arrives first. */
  visible: boolean;
  /** The number and the arc follow, a beat later. */
  counting: boolean;
}

export function MetricCard({ metric, index, visible, counting }: MetricCardProps) {
  return (
    <motion.div
      className="group rounded-card border border-line bg-surface p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileHover={{ y: -3 }}
      transition={{
        duration: DURATION.base,
        ease: EASE_OUT,
        delay: visible ? index * 0.07 : 0,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.9375rem] font-medium tracking-[-0.015em]">
            {metric.label}
          </p>
          <p className="mt-3 text-[2rem] font-medium leading-none tracking-[-0.035em]">
            <CountUp
              value={metric.score}
              active={counting}
              delay={index * 0.06}
              duration={1.3}
            />
          </p>
        </div>

        <ScoreRing
          value={metric.score}
          size={54}
          thickness={1.75}
          active={counting}
          delay={index * 0.06}
          duration={1.3}
          label={metric.label}
        >
          <span className="sr-only">{metric.score}</span>
        </ScoreRing>
      </div>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-ink-muted">
        {metric.note}
      </p>
    </motion.div>
  );
}
