"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreBar, ScoreDial } from "@/components/ui/ScoreDial";
import { CtaButton } from "@/components/ui/CtaButton";
import { Label, Reveal } from "@/components/ui/Reveal";
import { previewReport } from "@/lib/analysis/engine";
import { EASE_OUT, onceInView } from "@/lib/motion";

/**
 * What you actually get.
 *
 * A real fragment of a real report — the same components the flow renders, fed
 * the sample data — because a screenshot of the payoff is more persuasive than
 * any description of it. It animates when it is reached, not on load.
 */
export function ReportPreview() {
  const report = previewReport();
  const cardRef = useRef<HTMLDivElement>(null);
  const read = useInView(cardRef, onceInView);

  const rows = report.metrics.slice(0, 5);

  return (
    <section className="relative py-20 sm:py-28">
      <div className="gutter">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="max-w-md">
            <Reveal>
              <Label accent>The report</Label>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-6 text-display">
                Eight scores, and exactly what to change.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 text-lede text-ink-3">
                Every dimension tells you what people see, why it matters, what is
                lowering it, and the one edit that moves it.
              </p>
            </Reveal>
            <Reveal delay={0.24} className="mt-8">
              <CtaButton label="Get my report" />
            </Reveal>
          </div>

          {/* The artefact itself. */}
          <motion.div
            ref={cardRef}
            className="relative overflow-hidden rounded-panel bg-white p-6 shadow-raise ring-1 ring-edge sm:p-8"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={onceInView}
            transition={{ duration: 0.85, ease: EASE_OUT }}
          >
            <div className="flex items-center gap-5 sm:gap-7">
              <ScoreDial
                value={report.overall}
                size={104}
                thickness={4}
                active={read}
                duration={1.6}
                label="Overall perception score"
                className="shrink-0"
              >
                <span className="display text-[2.25rem] font-medium leading-none tracking-[-0.045em]">
                  <CountUp value={report.overall} active={read} duration={1.6} />
                </span>
              </ScoreDial>

              <div className="min-w-0">
                <Label>First impression</Label>
                <p className="display mt-2 text-[1.25rem] leading-tight tracking-[-0.026em] sm:text-[1.375rem]">
                  {report.archetype}
                </p>
                <p className="mt-2 text-[0.8125rem] text-ink-4">
                  Decided in {report.attentionSeconds}s
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-edge pt-7">
              {rows.map((metric, index) => (
                <div key={metric.key}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[0.875rem] text-ink-2">{metric.label}</span>
                    <span className="display text-[1rem] font-medium tabular tracking-tight">
                      <CountUp
                        value={metric.score}
                        active={read}
                        delay={0.2 + index * 0.07}
                        duration={1.2}
                      />
                    </span>
                  </div>
                  <ScoreBar
                    value={metric.score}
                    active={read}
                    delay={0.2 + index * 0.07}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>

            {/* The rest of the report continues past the edge of the card. */}
            <div className="relative mt-6">
              <div className="space-y-3 opacity-[0.35]">
                {report.metrics.slice(5, 7).map((metric) => (
                  <div key={metric.key}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[0.875rem] text-ink-2">{metric.label}</span>
                      <span className="display text-[1rem] font-medium tabular">
                        {metric.score}
                      </span>
                    </div>
                    <ScoreBar value={metric.score} active={read} className="mt-2" />
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
