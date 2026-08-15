"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Card, CardBody } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreBar } from "@/components/ui/ScoreDial";
import { CtaButton } from "@/components/ui/CtaButton";
import { Label, Reveal } from "@/components/ui/Reveal";
import { SAMPLE_REPORT } from "@/lib/analysis/sample";
import { EASE_OUT, onceInView } from "@/lib/motion";

/**
 * What you actually get.
 *
 * Not a picture of a report — the report's own card, the same component the flow
 * renders, with the rest of the deck stacked behind it. Showing the real object
 * is more persuasive than describing it, and it means this section can never
 * drift away from the product.
 */
export function ReportPreview() {
  const cardRef = useRef<HTMLDivElement>(null);
  const read = useInView(cardRef, onceInView);

  const metric = SAMPLE_REPORT.metrics.find((entry) => entry.key === "profileClarity")!;

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
                Eight scores, one card at a time.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 text-lede text-ink-3">
                Every dimension arrives as its own card: what a stranger sees, why
                it counts, what pulled it down, and the one edit that moves it.
                Swipe through them the way you would a wallet.
              </p>
            </Reveal>
            <Reveal delay={0.24} className="mt-8">
              <CtaButton label="Get my report" />
            </Reveal>
          </div>

          {/* The deck, at rest. */}
          <div ref={cardRef} className="relative mx-auto w-full max-w-[26rem]">
            {/* Two cards behind, to say there are more without showing them. */}
            <motion.div
              className="absolute inset-x-8 top-5 h-full rounded-card border border-edge bg-white/70"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={onceInView}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.12 }}
              aria-hidden
            />
            <motion.div
              className="absolute inset-x-4 top-2.5 h-full rounded-card border border-edge bg-white/85"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={onceInView}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.06 }}
              aria-hidden
            />

            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={onceInView}
              transition={{ duration: 0.85, ease: EASE_OUT }}
            >
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <h3 className="display text-[1.1875rem] tracking-[-0.026em]">
                        {metric.label}
                      </h3>
                      <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.09em] text-accent">
                        Start here
                      </span>
                    </div>
                    <div className="display flex shrink-0 items-baseline gap-0.5">
                      <CountUp
                        value={metric.score}
                        active={read}
                        duration={1.4}
                        className="text-[2rem] font-semibold leading-none tracking-[-0.04em]"
                      />
                      <span className="text-[0.75rem] font-medium text-ink-4">
                        /100
                      </span>
                    </div>
                  </div>

                  <ScoreBar
                    value={metric.score}
                    active={read}
                    delay={0.2}
                    className="mt-4"
                  />

                  <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-2">
                    {metric.detected}
                  </p>

                  <div className="mt-6 space-y-5 border-t border-edge pt-5">
                    <div>
                      <p className="text-label font-medium uppercase text-accent">
                        How to improve it
                      </p>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
                        {metric.howToImprove}
                      </p>
                    </div>
                    <div>
                      <p className="text-label font-medium uppercase text-ink-4">
                        After the change
                      </p>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">
                        {metric.expectedImpact}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>

            <p className="mt-6 text-center text-[0.75rem] text-ink-4">
              One of fifteen cards in a full report
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
