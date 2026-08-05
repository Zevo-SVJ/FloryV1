"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { MetricList } from "@/components/report/MetricList";
import { ScoreHero } from "@/components/report/ScoreHero";
import {
  ActionList,
  InsightPair,
  QuickWins,
  Verdict,
} from "@/components/report/ReportBlocks";
import { Button } from "@/components/ui/Button";
import { IconRefresh } from "@/components/ui/Icons";
import { Label } from "@/components/ui/Reveal";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useSceneClock } from "@/hooks/useSceneClock";
import { EASE_OUT } from "@/lib/motion";
import type { PerceptionReport } from "@/types/report";

/**
 * Step three: the report.
 *
 * It arrives in the order a person wants to hear it — the number, then what the
 * number is made of, then what is working, then what to change. The first beats
 * run on a clock because they are on screen the moment the report lands;
 * everything further down waits for the reader, so it is always mid-animation
 * when they arrive rather than already spent.
 */

const REVEAL = [
  { id: "score", duration: 0.35 },
  { id: "dial", duration: 0.6 },
  { id: "metrics", duration: 0.3 },
  { id: "counting", duration: 0.8 },
  { id: "insights", duration: 0 },
] as const;

export function ReportPanel({
  report,
  previewUrl,
  titleId,
}: {
  report: PerceptionReport;
  previewUrl: string | null;
  titleId: string;
}) {
  const { again, close } = useAnalyze();
  const reduced = useReducedMotionSafe();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const clock = useSceneClock(REVEAL, {
    loop: false,
    reduced,
    restingId: "insights",
  });

  const actionsRef = useRef<HTMLDivElement>(null);
  const winsRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);

  // The report scrolls inside the sheet, so reveals watch that container.
  const watch = { once: true, amount: 0.2, root: scrollRef } as const;
  const actionsRead = useInView(actionsRef, watch);
  const winsRead = useInView(winsRef, watch);
  const verdictRead = useInView(verdictRef, watch);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* A compact bar that takes over once the big score scrolls away. */}
      <div className="relative z-[1] flex items-center gap-3 border-b border-edge bg-white px-5 py-3.5 pr-14 sm:px-8 sm:pr-16">
        <Label className="flex-1">Perception report</Label>
        <motion.span
          className="display flex items-baseline gap-1 text-[0.9375rem] font-semibold"
          initial={false}
          animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : 4 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <span className="tabular">{report.overall}</span>
          <span className="text-[0.6875rem] font-medium text-ink-4">/100</span>
        </motion.span>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 120)}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10"
      >
        <h2 id={titleId} className="sr-only">
          Your perception report
        </h2>

        <ScoreHero
          report={report}
          previewUrl={previewUrl}
          visible={clock.past("score")}
          dialActive={clock.past("dial")}
        />

        <div className="mt-10 sm:mt-12">
          <Label className="mb-4">The eight dimensions</Label>
          <MetricList
            metrics={report.metrics}
            visible={clock.past("metrics")}
            counting={clock.past("counting")}
          />
        </div>

        <div className="mt-10 sm:mt-12">
          <InsightPair
            strength={report.strength}
            risk={report.risk}
            visible={clock.past("insights")}
          />
        </div>

        <div ref={actionsRef} className="mt-12 sm:mt-14">
          <ActionList actions={report.actions} visible={actionsRead} />
        </div>

        <div ref={winsRef} className="mt-10">
          <QuickWins items={report.quickWins} visible={winsRead} />
        </div>

        <div ref={verdictRef} className="mt-12 sm:mt-14">
          <Verdict report={report} visible={verdictRead} />
        </div>

        <motion.div
          className="mt-9 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: verdictRead ? 1 : 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="secondary"
              onClick={again}
              trailing={<IconRefresh className="h-4 w-4" />}
            >
              Analyze another profile
            </Button>
            <Button variant="ghost" onClick={close}>
              Done
            </Button>
          </div>
          <p className="text-[0.75rem] text-ink-4">
            Screenshot this, make the three changes, run it again in a month.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
