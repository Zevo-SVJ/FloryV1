"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { IconArrowRight } from "@/components/ui/Icons";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { EASE_OUT } from "@/lib/motion";
import { ordinal } from "@/lib/utils";
import type { PerceptionReport } from "@/types/report";

/**
 * The number.
 *
 * The one screen in the product that is not a card. After a wait spent watching
 * a deck advance, the deck gets out of the way and the score lands full-bleed —
 * because this is the moment the whole product exists for, and a moment that
 * arrives inside the same frame as everything else is not a moment.
 *
 * The arc is drawn as the mark's own gradient rather than a flat accent: the
 * score is the one place Blink's identity should be unmistakable.
 */

const ARC_SIZE = 260;
const THICKNESS = 8;

export function ScoreReveal({
  report,
  previewUrl,
  onContinue,
}: {
  report: PerceptionReport;
  previewUrl: string | null;
  onContinue: () => void;
}) {
  const reduced = useReducedMotionSafe();
  const [lit, setLit] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const timer = setTimeout(() => setLit(true), 180);
    return () => clearTimeout(timer);
  }, [reduced]);

  const radius = (ARC_SIZE - THICKNESS) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(100, report.overall)) / 100;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto brand-wash bg-canvas px-6 py-10 text-center sm:px-10 sm:py-14">
      {report.source === "sample" ? (
        <motion.span
          className="mb-6 rounded-full bg-accent-tint px-3 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.11em] text-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          Sample report
        </motion.span>
      ) : null}

      <div className="relative" style={{ width: ARC_SIZE, height: ARC_SIZE }}>
        <svg
          width={ARC_SIZE}
          height={ARC_SIZE}
          viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id="score-arc" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#0040F8" />
              <stop offset="0.55" stopColor="#0A7EFC" />
              <stop offset="1" stopColor="#10B2FD" />
            </linearGradient>
          </defs>

          <circle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={radius}
            fill="none"
            strokeWidth={THICKNESS}
            className="stroke-edge"
          />
          <motion.circle
            cx={ARC_SIZE / 2}
            cy={ARC_SIZE / 2}
            r={radius}
            fill="none"
            stroke="url(#score-arc)"
            strokeWidth={THICKNESS}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - (lit ? target : 0)) }}
            transition={reduced ? { duration: 0 } : { duration: 2.1, ease: EASE_OUT }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="display flex items-start leading-none"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
          >
            <CountUp
              value={report.overall}
              active={lit}
              duration={2}
              className="text-[5.25rem] font-semibold tracking-[-0.05em]"
            />
            <span className="mt-3 ml-1 text-[1.125rem] font-medium text-ink-4">
              /100
            </span>
          </motion.div>

          <motion.p
            className="mt-1 max-w-[15ch] text-[0.8125rem] leading-snug text-ink-3"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 1.5 }}
          >
            {report.archetype}
          </motion.p>
        </div>

        {/* The screenshot does not vanish at the finish either — it settles into
            the arc as the thing that was read. */}
        {previewUrl ? (
          <motion.div
            className="absolute -bottom-1 left-1/2 h-14 w-14 -translate-x-1/2 overflow-hidden rounded-full border-2 border-white bg-sunken shadow-card"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 1.9 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          </motion.div>
        ) : null}
      </div>

      <motion.h2
        className="display mt-10 max-w-[24ch] text-[1.5rem] leading-[1.18] tracking-[-0.03em] sm:text-[1.875rem]"
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.95, ease: EASE_OUT, delay: 1.7 }}
      >
        {report.headline}
      </motion.h2>

      <motion.p
        className="mt-5 max-w-[38ch] text-[0.9375rem] leading-relaxed text-ink-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_OUT, delay: 2 }}
      >
        A stranger decides in about {report.attentionSeconds} seconds. Yours lands
        in the {ordinal(report.percentile)} percentile of the profiles Blink
        scores against.
      </motion.p>

      <motion.div
        className="mt-9"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_OUT, delay: 2.3 }}
      >
        <Button
          size="lg"
          onClick={onContinue}
          trailing={<IconArrowRight className="h-4 w-4" />}
        >
          See what makes it
        </Button>
      </motion.div>
    </div>
  );
}
