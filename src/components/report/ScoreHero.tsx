"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { IconClock } from "@/components/ui/Icons";
import { EASE_OUT } from "@/lib/motion";
import { BAND_LABEL, bandFor, ordinal } from "@/lib/utils";
import type { PerceptionReport } from "@/types/report";

/**
 * The number people screenshot.
 *
 * It arrives before anything else in the report and stays the largest thing on
 * the page. Everything beside it is context: what the impression is called, how
 * long it took to form, and where it sits against everyone else.
 */
export function ScoreHero({
  report,
  previewUrl,
  visible,
  dialActive,
}: {
  report: PerceptionReport;
  previewUrl: string | null;
  visible: boolean;
  dialActive: boolean;
}) {
  const band = bandFor(report.overall);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.75, ease: EASE_OUT }}
      className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10"
    >
      <ScoreDial
        value={report.overall}
        size={168}
        thickness={5}
        active={dialActive}
        duration={1.8}
        label="Overall perception score"
        className="shrink-0"
      >
        <span className="flex flex-col items-center">
          <span className="display text-[3.75rem] font-medium leading-none tracking-[-0.05em]">
            <CountUp value={report.overall} active={dialActive} duration={1.8} />
          </span>
          <span className="mt-1 text-label font-medium uppercase text-ink-4">
            out of 100
          </span>
        </span>
      </ScoreDial>

      <div className="min-w-0 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-accent">
            {BAND_LABEL[band]} first impression
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-2.5 py-1 text-[0.6875rem] font-medium text-ink-2">
            <IconClock className="h-3 w-3 text-ink-4" />
            decided in {report.attentionSeconds}s
          </span>
        </div>

        <h3 className="display mt-4 text-[1.75rem] leading-[1.08] tracking-[-0.032em] sm:text-[2.125rem]">
          {report.archetype}
        </h3>

        <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
          {report.headline}
        </p>

        {previewUrl ? (
          <div className="mt-6 flex items-center justify-center gap-3 sm:justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="The screenshot that was analyzed"
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-edge"
            />
            <span className="text-[0.75rem] text-ink-4">
              Read from your screenshot · {ordinal(report.percentile)} percentile
            </span>
          </div>
        ) : (
          <p className="mt-6 text-[0.75rem] text-ink-4">
            Sample profile · {ordinal(report.percentile)} percentile
          </p>
        )}
      </div>
    </motion.div>
  );
}
