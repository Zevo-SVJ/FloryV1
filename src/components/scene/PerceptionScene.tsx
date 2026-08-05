"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Scene } from "@/components/scene/Scene";
import {
  SubjectAvatar,
  SubjectBio,
  SubjectGrid,
  SubjectHandle,
} from "@/components/profile/SubjectProfile";
import { CountUp } from "@/components/ui/CountUp";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useSceneClock } from "@/hooks/useSceneClock";
import { EASE_IN_OUT, EASE_OUT, sceneInView } from "@/lib/motion";

/**
 * Story one.
 *
 * A profile sits still while the judgements a stranger is already making become
 * visible, one at a time, each pinned to the thing that caused it. Then every
 * judgement collapses into the single number it was adding up to.
 */

const W = 520;
const H = 476;
const CENTRE = { x: 260, y: 214 };

const BEATS = [
  { id: "arrive", duration: 1.2 },
  { id: "labels", duration: 2.9 },
  { id: "hold", duration: 0.9 },
  { id: "merge", duration: 1.2 },
  { id: "score", duration: 2.6 },
  { id: "reset", duration: 0.8 },
] as const;

type Beat = (typeof BEATS)[number]["id"];

interface Judgement {
  text: string;
  side: "left" | "right";
  anchorX: number;
  anchorY: number;
  /** The part of the profile that produced it. */
  dot: { x: number; y: number };
}

const JUDGEMENTS: Judgement[] = [
  { text: "Trust", side: "left", anchorX: 126, anchorY: 92, dot: { x: 178, y: 112 } },
  { text: "Authority", side: "right", anchorX: 394, anchorY: 70, dot: { x: 342, y: 114 } },
  { text: "Creative", side: "left", anchorX: 108, anchorY: 186, dot: { x: 172, y: 188 } },
  { text: "Professional", side: "right", anchorX: 384, anchorY: 158, dot: { x: 346, y: 174 } },
  { text: "Luxury", side: "left", anchorX: 118, anchorY: 288, dot: { x: 180, y: 272 } },
  { text: "Friendly", side: "right", anchorX: 390, anchorY: 254, dot: { x: 340, y: 244 } },
  { text: "Minimal", side: "left", anchorX: 190, anchorY: 412, dot: { x: 224, y: 348 } },
];

const STEP = 0.29;

function Chip({
  item,
  index,
  beat,
}: {
  item: Judgement;
  index: number;
  beat: Beat;
}) {
  const shown = beat === "labels" || beat === "hold";
  const merging = beat === "merge";

  const position =
    item.side === "left"
      ? { right: W - item.anchorX, top: item.anchorY - 15 }
      : { left: item.anchorX, top: item.anchorY - 15 };

  const travel = { x: CENTRE.x - item.anchorX, y: CENTRE.y - item.anchorY };

  return (
    <motion.div
      className="absolute whitespace-nowrap rounded-full bg-white px-3.5 py-2 shadow-card ring-1 ring-edge"
      style={position}
      initial={{ opacity: 0, y: 7, scale: 0.94, filter: "blur(4px)" }}
      animate={
        merging
          ? { opacity: 0, x: travel.x * 0.72, y: travel.y * 0.72, scale: 0.78 }
          : shown
            ? { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, x: 0, y: 0, scale: 0.94 }
      }
      transition={{
        duration: merging ? 1 : 0.7,
        ease: merging ? EASE_IN_OUT : EASE_OUT,
        delay: shown && beat === "labels" ? index * STEP : 0,
      }}
    >
      <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink">
        {item.text}
      </span>
    </motion.div>
  );
}

function Threads({ beat, cycle }: { beat: Beat; cycle: number }) {
  const shown = beat === "labels" || beat === "hold";

  return (
    <svg className="absolute inset-0" width={W} height={H} aria-hidden>
      {JUDGEMENTS.map((item, index) => {
        const endX = item.side === "left" ? item.anchorX - 10 : item.anchorX + 10;

        return (
          <g key={`${item.text}-${cycle}`}>
            <motion.line
              x1={item.dot.x}
              y1={item.dot.y}
              x2={endX}
              y2={item.anchorY}
              stroke="var(--color-edge-strong)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={shown ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{
                duration: 0.75,
                ease: EASE_OUT,
                delay: shown && beat === "labels" ? index * STEP : 0,
              }}
            />
            <motion.circle
              cx={item.dot.x}
              cy={item.dot.y}
              r="2.5"
              fill="var(--color-accent)"
              initial={{ opacity: 0, scale: 0 }}
              animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{
                duration: 0.35,
                ease: EASE_OUT,
                delay: shown && beat === "labels" ? index * STEP : 0,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function MiniSubject() {
  return (
    <div className="w-[172px] overflow-hidden rounded-panel bg-white shadow-card ring-1 ring-edge">
      <div className="px-3.5 pt-3">
        <SubjectHandle />
      </div>
      <div className="flex items-center gap-3 px-3.5 pt-3">
        <SubjectAvatar size={42} />
        <div className="flex-1">
          <div className="tabular text-[11px] font-semibold leading-none">14.2k</div>
          <div className="mt-1 text-[8.5px] leading-none text-ink-3">followers</div>
        </div>
      </div>
      <div className="px-3.5 pb-3 pt-3">
        <SubjectBio />
      </div>
      <SubjectGrid rows={2} tile={56} gap={1} className="mx-auto pb-3.5" />
    </div>
  );
}

export function PerceptionScene() {
  const holder = useRef<HTMLDivElement>(null);
  const inView = useInView(holder, sceneInView);
  const reduced = useReducedMotionSafe();

  const clock = useSceneClock(BEATS, {
    active: inView,
    reduced,
    restingId: "score",
  });

  const beat = clock.id;
  const showScore = beat === "score";

  return (
    <div ref={holder} className="w-full">
      <Scene
        width={W}
        height={H}
        label="Perception labels — trust, authority, creative, professional, luxury, friendly, minimal — appear around a profile, each pinned to what caused it, then merge into one perception score."
      >
        <motion.div
          className="absolute"
          style={{ left: 174, top: 62 }}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{
            opacity: beat === "reset" ? 0 : showScore ? 0.08 : 1,
            y: 0,
            scale: showScore ? 0.95 : 1,
            filter: showScore ? "blur(5px)" : "blur(0px)",
          }}
          transition={{ duration: 1, ease: EASE_OUT }}
        >
          <MiniSubject />
        </motion.div>

        <Threads beat={beat} cycle={clock.cycle} />

        {JUDGEMENTS.map((item, index) => (
          <Chip
            key={`${item.text}-${clock.cycle}`}
            item={item}
            index={index}
            beat={beat}
          />
        ))}

        <AnimatePresence>
          {showScore ? (
            <motion.div
              key={`score-${clock.cycle}`}
              className="absolute inset-x-0 flex flex-col items-center"
              style={{ top: 128 }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.45 } }}
              transition={{ duration: 0.85, ease: EASE_OUT }}
            >
              <p className="text-label font-medium uppercase text-ink-4">
                Perception score
              </p>
              <p className="display mt-4 text-[104px] font-medium leading-none tracking-[-0.055em]">
                <CountUp value={82} active={showScore} duration={1.5} delay={0.12} />
              </p>
              <motion.div
                className="mt-5 h-[3px] rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: 104 }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.45 }}
              />
              <motion.p
                className="mt-6 max-w-[290px] text-center text-[13.5px] leading-relaxed text-ink-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.62 }}
              >
                Formed in 2.4 seconds, before a single caption was read.
              </motion.p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Scene>
    </div>
  );
}
