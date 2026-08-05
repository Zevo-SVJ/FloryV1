"use client";

import { motion } from "framer-motion";
import { IconAlert, IconCheck, IconTrend } from "@/components/ui/Icons";
import { EASE_OUT } from "@/lib/motion";
import { ordinal } from "@/lib/utils";
import type { Improvement, PerceptionReport } from "@/types/report";

const rise = (visible: boolean, delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
  transition: { duration: 0.8, ease: EASE_OUT, delay },
});

/* ── Strength & weakness ──────────────────────────────────────────────── */

export function InsightPair({
  report,
  visible,
}: {
  report: PerceptionReport;
  visible: boolean;
}) {
  const items = [
    { kind: "strength" as const, label: "Biggest strength", ...report.strength },
    { kind: "weakness" as const, label: "Biggest weakness", ...report.weakness },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item, index) => (
        <motion.div
          key={item.kind}
          className="rounded-card border border-line bg-surface p-7 sm:p-8"
          {...rise(visible, index * 0.1)}
        >
          <div className="flex items-center gap-2.5">
            {item.kind === "strength" ? (
              <IconTrend className="h-4 w-4 text-accent" />
            ) : (
              <IconAlert className="h-4 w-4 text-ink-faint" />
            )}
            <p className="text-eyebrow font-medium uppercase text-ink-faint">
              {item.label}
            </p>
          </div>

          <p className="mt-5 text-title font-medium">{item.title}</p>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            {item.detail}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Three instant improvements ───────────────────────────────────────── */

export function Improvements({
  improvements,
  visible,
}: {
  improvements: Improvement[];
  visible: boolean;
}) {
  return (
    <div>
      <p className="text-eyebrow font-medium uppercase text-ink-faint">
        Three instant improvements
      </p>

      <ol className="mt-8 border-t border-line">
        {improvements.map((improvement, index) => (
          <motion.li
            key={improvement.title}
            className="border-b border-line py-7"
            initial={{ opacity: 0, x: -18 }}
            animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
            transition={{ duration: 0.75, ease: EASE_OUT, delay: index * 0.12 }}
          >
            <div className="flex gap-6 sm:gap-10">
              <span className="tabular pt-1 text-[0.8125rem] font-medium text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="max-w-3xl flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <p className="text-[1.125rem] font-medium tracking-[-0.02em] sm:text-[1.25rem]">
                    {improvement.title}
                  </p>
                  <span className="rounded-full bg-accent-wash px-3 py-1 text-[0.75rem] font-medium text-accent">
                    {improvement.lift}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
                  {improvement.detail}
                </p>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ── Quick wins ───────────────────────────────────────────────────────── */

export function QuickWins({
  items,
  visible,
}: {
  items: string[];
  visible: boolean;
}) {
  return (
    <div>
      <p className="text-eyebrow font-medium uppercase text-ink-faint">Quick wins</p>

      <ul className="mt-7 flex flex-wrap gap-3">
        {items.map((item, index) => (
          <motion.li
            key={item}
            className="flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2.5"
            initial={{ opacity: 0, y: 12 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.07 }}
          >
            <IconCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="text-[0.875rem] tracking-[-0.01em]">{item}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ── Final verdict ────────────────────────────────────────────────────── */

export function Verdict({
  report,
  visible,
}: {
  report: PerceptionReport;
  visible: boolean;
}) {
  return (
    <motion.div
      className="rounded-panel bg-paper-deep p-8 sm:p-12 lg:p-16"
      {...rise(visible, 0)}
    >
      <p className="text-eyebrow font-medium uppercase text-ink-faint">
        Final verdict
      </p>

      <p className="mt-8 max-w-3xl text-title leading-[1.22]">
        <span className="serif-italic">{report.verdict}</span>
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line-strong pt-7 text-[0.8125rem] text-ink-muted">
        <span>
          Overall{" "}
          <span className="tabular font-medium text-ink">{report.overall}</span>
        </span>
        <span>
          Decision window{" "}
          <span className="tabular font-medium text-ink">
            {report.attentionSeconds}s
          </span>
        </span>
        <span>
          Percentile{" "}
          <span className="tabular font-medium text-ink">
            {ordinal(report.percentile)}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
