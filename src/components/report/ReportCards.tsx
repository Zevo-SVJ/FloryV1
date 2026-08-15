"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Card, CardBody } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { IconChevronDown, IconCheck, IconTrend } from "@/components/ui/Icons";
import { ScoreBar } from "@/components/ui/ScoreDial";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Action, Insight, Metric, PerceptionReport } from "@/types/report";

/**
 * The report, cut into cards.
 *
 * One idea per card, in the order a person can act on it: the eight dimensions
 * first, then what is working, then what is costing, then the three things to
 * do, then the verdict. Collapsed, a card is a headline and a number. Opened, it
 * answers the five questions anyone actually has about a score — what was seen,
 * why it counts, what pulled it down, what to do, and what changes afterwards.
 */

export type ReportCardModel =
  | { id: string; kind: "metric"; metric: Metric; lowest: boolean }
  | { id: string; kind: "insight"; tone: "strength" | "risk"; insight: Insight }
  | { id: string; kind: "action"; action: Action; position: number }
  | { id: string; kind: "wins"; items: string[] }
  | { id: string; kind: "verdict"; text: string };

export function reportCards(report: PerceptionReport): ReportCardModel[] {
  const lowest = report.metrics.reduce((low, metric) =>
    metric.score < low.score ? metric : low,
  );

  return [
    ...report.metrics.map<ReportCardModel>((metric) => ({
      id: `metric-${metric.key}`,
      kind: "metric",
      metric,
      lowest: metric.key === lowest.key,
    })),
    {
      id: "strength",
      kind: "insight",
      tone: "strength",
      insight: report.strength,
    },
    { id: "risk", kind: "insight", tone: "risk", insight: report.risk },
    ...report.actions.map<ReportCardModel>((action, index) => ({
      id: `action-${index}`,
      kind: "action",
      action,
      position: index + 1,
    })),
    { id: "wins", kind: "wins", items: report.quickWins },
    { id: "verdict", kind: "verdict", text: report.verdict },
  ];
}

export function ReportCardView({
  model,
  expanded,
  onToggle,
  active,
}: {
  model: ReportCardModel;
  expanded: boolean;
  onToggle: () => void;
  active: boolean;
}) {
  if (model.kind === "metric") {
    return (
      <MetricCard
        metric={model.metric}
        lowest={model.lowest}
        expanded={expanded}
        onToggle={onToggle}
        active={active}
      />
    );
  }

  if (model.kind === "insight") {
    return <InsightCard tone={model.tone} insight={model.insight} />;
  }

  if (model.kind === "action") {
    return <ActionCard action={model.action} position={model.position} />;
  }

  if (model.kind === "wins") {
    return <WinsCard items={model.items} />;
  }

  return <VerdictCard text={model.text} />;
}

/* ── The eight dimensions ─────────────────────────────────────────────────── */

function MetricCard({
  metric,
  lowest,
  expanded,
  onToggle,
  active,
}: {
  metric: Metric;
  lowest: boolean;
  expanded: boolean;
  onToggle: () => void;
  active: boolean;
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex h-full w-full flex-col text-left"
      >
        <CardBody scroll={expanded} className="gap-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="display text-[1.1875rem] tracking-[-0.026em]">
                  {metric.label}
                </h3>
                {lowest ? (
                  <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.09em] text-accent">
                    Start here
                  </span>
                ) : null}
              </div>
            </div>

            <div className="display flex shrink-0 items-baseline gap-0.5">
              <CountUp
                value={metric.score}
                active={active}
                duration={1.2}
                className="text-[2rem] font-semibold leading-none tracking-[-0.04em]"
              />
              <span className="text-[0.75rem] font-medium text-ink-4">/100</span>
            </div>
          </div>

          <ScoreBar value={metric.score} active={active} delay={0.15} className="mt-4" />

          <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-2">
            {metric.detected}
          </p>

          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.34, ease: EASE_OUT }}
                className="mt-6 space-y-5 border-t border-edge pt-5"
              >
                <Field label="Why this matters" body={metric.whyItMatters} />
                <Field label="What caused the score" body={metric.whatLowersIt} />
                <Field label="How to improve it" body={metric.howToImprove} accent />
                <Field label="After the change" body={metric.expectedImpact} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-auto flex items-center gap-1.5 pt-5 text-[0.8125rem] text-ink-4">
            <span>{expanded ? "Close" : "What this means"}</span>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="inline-flex"
            >
              <IconChevronDown className="h-3.5 w-3.5" />
            </motion.span>
          </div>
        </CardBody>
      </button>
    </Card>
  );
}

function Field({
  label,
  body,
  accent = false,
}: {
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-label font-medium uppercase",
          accent ? "text-accent" : "text-ink-4",
        )}
      >
        {label}
      </p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

/* ── Everything else ──────────────────────────────────────────────────────── */

function InsightCard({ tone, insight }: { tone: "strength" | "risk"; insight: Insight }) {
  return (
    <Card>
      <CardBody>
        <p
          className={cn(
            "text-label font-medium uppercase",
            tone === "strength" ? "text-accent" : "text-ink-4",
          )}
        >
          {tone === "strength" ? "What is working" : "What it is costing you"}
        </p>
        <h3 className="display mt-3 text-[1.375rem] leading-[1.2] tracking-[-0.03em]">
          {insight.title}
        </h3>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">
          {insight.detail}
        </p>
      </CardBody>
    </Card>
  );
}

function ActionCard({ action, position }: { action: Action; position: number }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2.5">
          <span className="tabular text-[0.75rem] font-medium text-accent">
            Do this {position === 1 ? "first" : position === 2 ? "second" : "third"}
          </span>
        </div>

        <h3 className="display mt-3 text-[1.3125rem] leading-[1.2] tracking-[-0.03em]">
          {action.title}
        </h3>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">
          {action.detail}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <span className="rounded-full bg-sunken px-3 py-1.5 text-[0.75rem] text-ink-3">
            {action.effort}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1.5 text-[0.75rem] font-medium text-accent">
            <IconTrend className="h-3.5 w-3.5" />
            {action.lift}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function WinsCard({ items }: { items: string[] }) {
  return (
    <Card>
      <CardBody>
        <p className="text-label font-medium uppercase text-ink-4">
          Five minutes each
        </p>
        <h3 className="display mt-3 text-[1.3125rem] tracking-[-0.03em]">
          Quick wins
        </h3>

        <ul className="mt-5 space-y-3.5">
          {items.map((item, index) => (
            <motion.li
              key={item}
              className="flex items-start gap-3 text-[0.9375rem] leading-snug text-ink-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.06 * index, ease: EASE_OUT }}
            >
              <span className="mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent">
                <IconCheck className="h-3 w-3" />
              </span>
              {item}
            </motion.li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function VerdictCard({ text }: { text: string }) {
  return (
    <Card tone="accent">
      <CardBody className="justify-center">
        <p className="text-label font-medium uppercase text-white/70">The verdict</p>
        <p className="display mt-4 text-[1.25rem] leading-[1.35] tracking-[-0.024em] text-white sm:text-[1.375rem]">
          {text}
        </p>
      </CardBody>
    </Card>
  );
}
