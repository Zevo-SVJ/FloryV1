"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MetricCard } from "@/components/report/MetricCard";
import { ReportHead } from "@/components/report/ReportHead";
import {
  Improvements,
  InsightPair,
  QuickWins,
  Verdict,
} from "@/components/report/ReportInsights";
import { Button } from "@/components/ui/Button";
import { IconRefresh } from "@/components/ui/Icons";
import { useCinematicClock } from "@/hooks/useCinematicClock";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { EASE_OUT } from "@/lib/motion";
import type { PerceptionReport } from "@/types/report";

/**
 * The report.
 *
 * It arrives in the order a person would want to hear it: the number first,
 * then what the number is made of, then what is working, then what to do.
 * Nothing appears at the same time as anything else.
 *
 * The first four beats are on a clock, because they are on screen the moment
 * the report lands. Everything below the fold waits for the reader instead —
 * so it is always mid-animation when they arrive, never already spent.
 */

const REVEAL = [
  { id: "score", duration: 0.45 },
  { id: "ring", duration: 0.85 },
  { id: "cards", duration: 0.6 },
  { id: "metrics", duration: 0.8 },
  { id: "insights", duration: 0 },
] as const;

const WHEN_READ = { once: true, amount: 0.2 } as const;

interface ReportProps {
  report: PerceptionReport;
  previewUrl: string | null;
  onReset: () => void;
}

export function Report({ report, previewUrl, onReset }: ReportProps) {
  const reduced = useReducedMotionSafe();

  const clock = useCinematicClock(REVEAL, {
    loop: false,
    reduced,
    restingId: "insights",
  });

  const improvementsRef = useRef<HTMLDivElement>(null);
  const winsRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);

  const improvementsRead = useInView(improvementsRef, WHEN_READ);
  const winsRead = useInView(winsRef, WHEN_READ);
  const verdictRead = useInView(verdictRef, WHEN_READ);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.85, ease: EASE_OUT }}
    >
      <div className="rounded-stage border border-line bg-surface/60 p-6 sm:p-10 lg:p-14">
        <ReportHead
          report={report}
          previewUrl={previewUrl}
          visible={clock.past("score")}
          ringActive={clock.past("ring")}
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {report.metrics.map((metric, index) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              index={index}
              visible={clock.past("cards")}
              counting={clock.past("metrics")}
            />
          ))}
        </div>

        <div className="mt-5">
          <InsightPair report={report} visible={clock.past("insights")} />
        </div>

        <div ref={improvementsRef} className="mt-20 lg:mt-24">
          <Improvements
            improvements={report.improvements}
            visible={improvementsRead}
          />
        </div>

        <div ref={winsRef} className="mt-16">
          <QuickWins items={report.quickWins} visible={winsRead} />
        </div>

        <div ref={verdictRef} className="mt-20 lg:mt-24">
          <Verdict report={report} visible={verdictRead} />
        </div>

        <motion.div
          className="mt-14 flex flex-col items-center gap-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: verdictRead ? 1 : 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.35 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={onReset}
            trailing={<IconRefresh className="h-4 w-4" />}
          >
            Analyze another profile
          </Button>
          <p className="text-[0.8125rem] text-ink-faint">
            Screenshot this. Run it again in a month.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
