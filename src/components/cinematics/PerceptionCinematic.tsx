"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Stage } from "@/components/stage/Stage";
import {
  MockAvatar,
  MockBio,
  MockGrid,
  MockUsernameBar,
} from "@/components/mock/ProfileParts";
import { CountUp } from "@/components/ui/CountUp";
import { useCinematicClock } from "@/hooks/useCinematicClock";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { EASE_IN_OUT, EASE_OUT, stageInView } from "@/lib/motion";

/**
 * Section two.
 *
 * A profile sits still while the judgements a stranger makes about it become
 * visible, one at a time. Then every judgement collapses into the single
 * number they were adding up to all along.
 */

const STAGE_WIDTH = 520;
const STAGE_HEIGHT = 490;
const CENTRE = { x: 260, y: 226 };

const STEPS = [
  { id: "enter", duration: 1.3 },
  { id: "labels", duration: 2.9 },
  { id: "hold", duration: 1 },
  { id: "merge", duration: 1.3 },
  { id: "score", duration: 2.6 },
  { id: "reset", duration: 0.9 },
] as const;

type Phase = (typeof STEPS)[number]["id"];

interface Label {
  text: string;
  side: "left" | "right";
  /** Point the label is pinned to, in stage coordinates. */
  anchorX: number;
  anchorY: number;
  /** Where on the profile this judgement comes from. */
  dot: { x: number; y: number };
}

const LABELS: Label[] = [
  { text: "Trust", side: "left", anchorX: 122, anchorY: 106, dot: { x: 176, y: 126 } },
  { text: "Authority", side: "right", anchorX: 398, anchorY: 82, dot: { x: 344, y: 128 } },
  { text: "Creative", side: "left", anchorX: 104, anchorY: 202, dot: { x: 170, y: 204 } },
  { text: "Professional", side: "right", anchorX: 386, anchorY: 172, dot: { x: 348, y: 190 } },
  { text: "Luxury", side: "left", anchorX: 116, anchorY: 312, dot: { x: 178, y: 294 } },
  { text: "Friendly", side: "right", anchorX: 392, anchorY: 276, dot: { x: 342, y: 264 } },
  { text: "Minimal", side: "left", anchorX: 214, anchorY: 424, dot: { x: 236, y: 372 } },
];

const STAGGER = 0.3;

function LabelChip({
  label,
  index,
  phase,
}: {
  label: Label;
  index: number;
  phase: Phase;
}) {
  const visible = phase === "labels" || phase === "hold";
  const merging = phase === "merge";

  const position =
    label.side === "left"
      ? { right: STAGE_WIDTH - label.anchorX, top: label.anchorY - 15 }
      : { left: label.anchorX, top: label.anchorY - 15 };

  const travel = {
    x: CENTRE.x - label.anchorX,
    y: CENTRE.y - label.anchorY,
  };

  return (
    <motion.div
      className="absolute whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-2 shadow-lift"
      style={position}
      initial={{ opacity: 0, y: 8, scale: 0.94, filter: "blur(4px)" }}
      animate={
        merging
          ? { opacity: 0, x: travel.x * 0.7, y: travel.y * 0.7, scale: 0.8 }
          : visible
            ? { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, x: 0, y: 0, scale: 0.94 }
      }
      transition={{
        duration: merging ? 1.1 : 0.75,
        ease: merging ? EASE_IN_OUT : EASE_OUT,
        delay: visible && phase === "labels" ? index * STAGGER : 0,
      }}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink">
        {label.text}
      </span>
    </motion.div>
  );
}

function Connectors({ phase, cycle }: { phase: Phase; cycle: number }) {
  const visible = phase === "labels" || phase === "hold";

  return (
    <svg
      className="absolute inset-0"
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      aria-hidden
    >
      {LABELS.map((label, index) => {
        const endX = label.side === "left" ? label.anchorX - 10 : label.anchorX + 10;

        return (
          <g key={`${label.text}-${cycle}`}>
            <motion.line
              x1={label.dot.x}
              y1={label.dot.y}
              x2={endX}
              y2={label.anchorY}
              stroke="var(--color-line-strong)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                visible
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{
                duration: 0.8,
                ease: EASE_OUT,
                delay: visible && phase === "labels" ? index * STAGGER : 0,
              }}
            />
            <motion.circle
              cx={label.dot.x}
              cy={label.dot.y}
              r="2.5"
              fill="var(--color-accent)"
              initial={{ opacity: 0, scale: 0 }}
              animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{
                duration: 0.4,
                ease: EASE_OUT,
                delay: visible && phase === "labels" ? index * STAGGER : 0,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function MiniProfile() {
  return (
    <div className="w-[176px] overflow-hidden rounded-[20px] bg-surface shadow-panel">
      <div className="px-3.5 pt-3">
        <MockUsernameBar />
      </div>
      <div className="flex items-center gap-3 px-3.5 pt-3">
        <MockAvatar size={44} />
        <div className="flex-1">
          <div className="tabular text-[11px] font-semibold leading-none">14.2k</div>
          <div className="mt-1 text-[9px] leading-none text-ink-muted">followers</div>
        </div>
      </div>
      <div className="px-3.5 pb-3 pt-3">
        <MockBio />
      </div>
      <MockGrid rows={2} tile={58} gap={1} className="mx-auto pb-3.5" />
    </div>
  );
}

export function PerceptionCinematic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, stageInView);
  const reduced = useReducedMotionSafe();

  const clock = useCinematicClock(STEPS, {
    active: inView,
    reduced,
    restingId: "score",
  });

  const phase = clock.id;
  const showScore = phase === "score";
  const profileVisible = phase !== "reset";

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        label="Perception labels — trust, authority, creative, professional, luxury, friendly, minimal — appear around a profile and then merge into a single perception score."
      >
        {/* The profile being judged. */}
        <motion.div
          className="absolute"
          style={{ left: 172, top: 72 }}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{
            opacity: profileVisible ? (showScore ? 0.09 : 1) : 0,
            y: 0,
            scale: showScore ? 0.94 : 1,
            filter: showScore ? "blur(5px)" : "blur(0px)",
          }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        >
          <MiniProfile />
        </motion.div>

        <Connectors phase={phase} cycle={clock.cycle} />

        {LABELS.map((label, index) => (
          <LabelChip
            key={`${label.text}-${clock.cycle}`}
            label={label}
            index={index}
            phase={phase}
          />
        ))}

        {/* Everything above resolves to this. */}
        <AnimatePresence>
          {showScore ? (
            <motion.div
              key={`score-${clock.cycle}`}
              className="absolute inset-x-0 flex flex-col items-center"
              style={{ top: 150 }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
            >
              <p className="text-eyebrow font-medium uppercase text-ink-faint">
                Perception score
              </p>
              <p className="mt-4 text-[112px] font-medium leading-none tracking-[-0.05em]">
                <CountUp value={84} active={showScore} duration={1.6} delay={0.15} />
              </p>
              <motion.div
                className="mt-6 h-px bg-accent"
                initial={{ width: 0 }}
                animate={{ width: 120 }}
                transition={{ duration: 1, ease: EASE_OUT, delay: 0.5 }}
              />
              <motion.p
                className="mt-6 max-w-[280px] text-center text-[13px] leading-relaxed text-ink-muted"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.7 }}
              >
                Formed in 2.4 seconds, before a single caption was read.
              </motion.p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Stage>
    </div>
  );
}
