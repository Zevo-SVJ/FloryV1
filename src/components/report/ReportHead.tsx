"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { EASE_OUT } from "@/lib/motion";
import { ordinal } from "@/lib/utils";
import type { PerceptionReport } from "@/types/report";

interface ReportHeadProps {
  report: PerceptionReport;
  previewUrl: string | null;
  /** The overall score arrives before anything else in the report. */
  visible: boolean;
  ringActive: boolean;
}

export function ReportHead({
  report,
  previewUrl,
  visible,
  ringActive,
}: ReportHeadProps) {
  return (
    <div className="grid items-center gap-12 md:grid-cols-[1fr_auto] md:gap-16">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <div className="flex items-center gap-4">
          {previewUrl ? (
            // A blob: URL from the visitor's own file — there is nothing for
            // next/image to optimise, and it must never leave the device.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="The screenshot that was analyzed"
              className="h-12 w-12 rounded-[10px] border border-line object-cover"
            />
          ) : null}
          <div>
            <p className="text-eyebrow font-medium uppercase text-accent">
              Perception report
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-ink-faint">
              Decided in {report.attentionSeconds}s · {ordinal(report.percentile)}{" "}
              percentile of profiles analyzed
            </p>
          </div>
        </div>

        <h3 className="mt-8 text-display font-medium">{report.archetype}</h3>

        <p className="mt-6 max-w-xl text-lede text-ink-muted">{report.summary}</p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center md:items-end"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.12 }}
      >
        <ScoreRing
          value={report.overall}
          size={208}
          thickness={2.5}
          active={ringActive}
          duration={1.9}
          label="Overall perception score"
        >
          <div className="flex flex-col items-center">
            <span className="text-[4.25rem] font-medium leading-none tracking-[-0.045em]">
              <CountUp value={report.overall} active={ringActive} duration={1.9} />
            </span>
            <span className="mt-2 text-eyebrow font-medium uppercase text-ink-faint">
              out of 100
            </span>
          </div>
        </ScoreRing>
      </motion.div>
    </div>
  );
}
