"use client";

import { motion } from "framer-motion";
import { IconAlert, IconCheck, IconClock, IconTrend } from "@/components/ui/Icons";
import { Label } from "@/components/ui/Reveal";
import { EASE_OUT } from "@/lib/motion";
import { ordinal } from "@/lib/utils";
import type { Action, Insight, PerceptionReport } from "@/types/report";

const enter = (visible: boolean, delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
  transition: { duration: 0.7, ease: EASE_OUT, delay },
});

/* ── What is working, what is at risk ───────────────────────────────────── */

export function InsightPair({
  strength,
  risk,
  visible,
}: {
  strength: Insight;
  risk: Insight;
  visible: boolean;
}) {
  const cards: { kind: "strength" | "risk"; label: string; item: Insight }[] = [
    { kind: "strength", label: "Working for you", item: strength },
    { kind: "risk", label: "Costing you follows", item: risk },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map(({ kind, label, item }, index) => (
        <motion.div
          key={kind}
          {...enter(visible, index * 0.1)}
          className="rounded-panel bg-white p-6 ring-1 ring-edge sm:p-7"
        >
          <div className="flex items-center gap-2">
            {kind === "strength" ? (
              <IconTrend className="h-4 w-4 text-accent" />
            ) : (
              <IconAlert className="h-4 w-4 text-ink-3" />
            )}
            <Label>{label}</Label>
          </div>
          <h4 className="display mt-4 text-[1.1875rem] leading-snug tracking-[-0.022em]">
            {item.title}
          </h4>
          <p className="mt-3 text-[0.875rem] leading-[1.65] text-ink-2">{item.detail}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Do these three things ──────────────────────────────────────────────── */

export function ActionList({
  actions,
  visible,
}: {
  actions: Action[];
  visible: boolean;
}) {
  return (
    <div>
      <Label>Do these three things</Label>

      <ol className="mt-6 space-y-3">
        {actions.map((action, index) => (
          <motion.li
            key={action.title}
            {...enter(visible, index * 0.1)}
            className="rounded-panel bg-white p-5 ring-1 ring-edge sm:p-6"
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <span className="display mt-0.5 w-6 shrink-0 text-[0.9375rem] font-semibold text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <h4 className="display text-[1.0625rem] leading-snug tracking-[-0.02em] sm:text-[1.125rem]">
                    {action.title}
                  </h4>
                  <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[0.6875rem] font-semibold text-accent">
                    {action.lift}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-ink-4">
                    <IconClock className="h-3 w-3" />
                    {action.effort}
                  </span>
                </div>
                <p className="mt-2.5 text-[0.875rem] leading-[1.65] text-ink-2">
                  {action.detail}
                </p>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ── Two-minute fixes ───────────────────────────────────────────────────── */

export function QuickWins({
  items,
  visible,
}: {
  items: string[];
  visible: boolean;
}) {
  return (
    <div>
      <Label>While you are in there</Label>
      <ul className="mt-5 flex flex-wrap gap-2.5">
        {items.map((item, index) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, y: 10 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: visible ? index * 0.06 : 0 }}
            className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 ring-1 ring-edge"
          >
            <IconCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="text-[0.8125rem] tracking-[-0.008em]">{item}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ── The verdict ────────────────────────────────────────────────────────── */

export function Verdict({
  report,
  visible,
}: {
  report: PerceptionReport;
  visible: boolean;
}) {
  return (
    <motion.div
      {...enter(visible)}
      className="rounded-panel bg-ink p-7 text-white sm:p-10"
    >
      <Label className="text-white/45">The verdict</Label>
      <p className="display mt-5 max-w-2xl text-[1.375rem] leading-[1.35] tracking-[-0.026em] sm:text-[1.625rem]">
        {report.verdict}
      </p>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/12 pt-6 text-[0.8125rem] text-white/55">
        <span>
          Overall <span className="tabular font-medium text-white">{report.overall}</span>
        </span>
        <span>
          Decision window{" "}
          <span className="tabular font-medium text-white">
            {report.attentionSeconds}s
          </span>
        </span>
        <span>
          Percentile{" "}
          <span className="tabular font-medium text-white">
            {ordinal(report.percentile)}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
