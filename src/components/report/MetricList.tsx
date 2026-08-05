"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreBar } from "@/components/ui/ScoreDial";
import { IconChevronDown } from "@/components/ui/Icons";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { BAND_LABEL, bandFor, cn } from "@/lib/utils";
import type { Metric } from "@/types/report";

/**
 * The eight dimensions.
 *
 * Collapsed, it is a scannable ranking — where you are strong, where you are
 * not. Opened, each row explains itself in the order a person actually asks:
 * what people see, why it matters, what is dragging it down, and the one thing
 * to change. Rows open one at a time so the list never becomes a wall.
 */
export function MetricList({
  metrics,
  visible,
  counting,
}: {
  metrics: Metric[];
  visible: boolean;
  counting: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);

  // The weakest dimension is where the reader should start, so it is the one
  // thing in this list allowed to use the accent.
  const weakest = metrics.reduce(
    (lowest, metric) => (metric.score < lowest.score ? metric : lowest),
    metrics[0]!,
  );

  return (
    <div className="overflow-hidden rounded-panel bg-white ring-1 ring-edge">
      {metrics.map((metric, index) => {
        const isOpen = open === metric.key;
        const band = bandFor(metric.score);
        const isWeakest = metric.key === weakest.key;

        return (
          <motion.div
            key={metric.key}
            initial={{ opacity: 0, y: 14 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.55, ease: EASE_OUT, delay: visible ? index * 0.055 : 0 }}
            className={cn(index > 0 && "border-t border-edge")}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : metric.key)}
              className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-canvas sm:gap-6 sm:px-6 sm:py-5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2.5">
                  <span className="text-[0.9375rem] font-medium tracking-[-0.015em]">
                    {metric.label}
                  </span>
                  {/* Held back until the number has finished counting, so the
                      word and the figure never contradict each other. */}
                  <motion.span
                    className="hidden text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-ink-4 sm:inline"
                    initial={false}
                    animate={{ opacity: counting ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT, delay: counting ? 1.15 : 0 }}
                  >
                    {BAND_LABEL[band]}
                  </motion.span>
                  {isWeakest ? (
                    <motion.span
                      className="rounded-full bg-accent-tint px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-accent"
                      initial={false}
                      animate={{ opacity: counting ? 1 : 0 }}
                      transition={{
                        duration: 0.4,
                        ease: EASE_OUT,
                        delay: counting ? 1.25 : 0,
                      }}
                    >
                      Start here
                    </motion.span>
                  ) : null}
                </span>
                <ScoreBar
                  value={metric.score}
                  active={counting}
                  delay={index * 0.05}
                  className="mt-2.5 max-w-[22rem]"
                />
              </span>

              <span className="display w-11 shrink-0 text-right text-[1.375rem] font-medium tracking-[-0.03em]">
                <CountUp
                  value={metric.score}
                  active={counting}
                  delay={index * 0.05}
                  duration={1.2}
                />
              </span>

              <motion.span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors group-hover:bg-sunken group-hover:text-ink"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.35, ease: EASE_IN_OUT }}
              >
                <IconChevronDown className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.4, ease: EASE_IN_OUT },
                    opacity: { duration: 0.28, ease: EASE_OUT },
                  }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-x-10 gap-y-5 bg-canvas px-4 pb-6 pt-5 sm:grid-cols-2 sm:px-6">
                    <Field label="What people see" value={metric.reading} />
                    <Field label="Why it matters" value={metric.whyItMatters} />
                    <Field label="What lowers it" value={metric.whatLowersIt} />
                    <Field
                      label="How to improve it"
                      value={metric.howToImprove}
                      tone="accent"
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  /** Only the instruction is allowed to carry the accent. */
  tone?: "accent";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-label font-medium uppercase",
          tone === "accent" ? "text-accent" : "text-ink-4",
        )}
      >
        {label}
      </p>
      <p className="mt-2 text-[0.875rem] leading-[1.6] text-ink-2">{value}</p>
    </div>
  );
}
