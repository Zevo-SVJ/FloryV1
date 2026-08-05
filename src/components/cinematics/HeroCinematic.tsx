"use client";

import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  type Transition,
} from "framer-motion";
import { Stage } from "@/components/stage/Stage";
import {
  MockAvatar,
  MockBio,
  MockGrid,
  MockHighlights,
  MockStatusBar,
  MockTabs,
  MockUsernameBar,
} from "@/components/mock/ProfileParts";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useCinematicClock } from "@/hooks/useCinematicClock";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { EASE_IN_OUT, EASE_OUT, stageInView } from "@/lib/motion";

/**
 * The hero film.
 *
 * A profile arrives → it is captured → the screenshot separates into the
 * things a stranger actually reacts to → each layer is read → the layers
 * collapse into measurements → the measurements resolve into a report.
 *
 * Eight beats, fourteen seconds, then it begins again. The whole product is
 * explained here without a single sentence of copy.
 */

const STAGE_WIDTH = 460;
const STAGE_HEIGHT = 580;

const STEPS = [
  { id: "enter", duration: 1.5 },
  { id: "capture", duration: 1.2 },
  { id: "separate", duration: 1.7 },
  { id: "scan", duration: 2.2 },
  { id: "collect", duration: 1.2 },
  { id: "score", duration: 1.6 },
  { id: "report", duration: 2.4 },
  { id: "reset", duration: 0.9 },
] as const;

type Phase = (typeof STEPS)[number]["id"];

/* Card geometry, in stage coordinates. */
const CARD = { x: 80, y: 44, w: 300, h: 489 };

interface PartGeometry {
  left: number;
  top: number;
  width: number;
  /** Where the piece travels to once the screenshot separates. */
  exploded: { x: number; y: number; scale: number };
  /** Reading order during the scan. */
  scanDelay: number;
  label: string;
  labelSide: "left" | "right";
}

const PARTS = {
  avatar: {
    left: 96,
    top: 104,
    width: 64,
    exploded: { x: -46, y: -12, scale: 1.12 },
    scanDelay: 0.18,
    label: "Photo",
    labelSide: "left",
  },
  bio: {
    left: 96,
    top: 182,
    width: 268,
    exploded: { x: 40, y: -44, scale: 0.94 },
    scanDelay: 0.62,
    label: "Bio",
    labelSide: "right",
  },
  highlights: {
    left: 96,
    top: 256,
    width: 268,
    exploded: { x: -40, y: -8, scale: 0.9 },
    scanDelay: 1.06,
    label: "Highlights",
    labelSide: "left",
  },
  grid: {
    left: 86,
    top: 355,
    width: 268,
    exploded: { x: 34, y: -16, scale: 0.86 },
    scanDelay: 1.5,
    label: "Grid",
    labelSide: "right",
  },
} satisfies Record<string, PartGeometry>;

type PartKey = keyof typeof PARTS;

const SETTLED = { x: 0, y: 0, scale: 1, opacity: 1 };

function partState(key: PartKey, phase: Phase) {
  const { exploded } = PARTS[key];

  switch (phase) {
    case "enter":
    case "capture":
      return SETTLED;
    case "separate":
    case "scan":
      return { ...exploded, opacity: 1 };
    case "collect":
      // Everything drifts back toward the centre and dissolves.
      return { x: exploded.x * 0.25, y: exploded.y * 0.25, scale: 0.94, opacity: 0 };
    default:
      return { x: 0, y: 0, scale: 0.94, opacity: 0 };
  }
}

const partTransition: Record<string, Transition> = {
  separate: { duration: 1.5, ease: EASE_OUT },
  collect: { duration: 1, ease: EASE_IN_OUT },
  default: { duration: 0.8, ease: EASE_OUT },
};

function Part({
  partKey,
  phase,
  cycle,
  children,
}: {
  partKey: PartKey;
  phase: Phase;
  cycle: number;
  children: React.ReactNode;
}) {
  const geometry = PARTS[partKey];
  const state = partState(partKey, phase);
  const isExploded = phase === "separate" || phase === "scan";
  const isScanning = phase === "scan";

  const transition =
    phase === "separate"
      ? partTransition.separate
      : phase === "collect"
        ? partTransition.collect
        : partTransition.default;

  return (
    <motion.div
      className="absolute"
      style={{ left: geometry.left, top: geometry.top, width: geometry.width }}
      animate={state}
      transition={transition}
    >
      {/* The extracted piece sits on its own surface once it detaches. */}
      <motion.div
        className="relative rounded-[14px]"
        animate={{
          backgroundColor: isExploded ? "#ffffff" : "rgba(255,255,255,0)",
          boxShadow: isExploded
            ? "0 1px 1px rgba(22,19,15,0.03), 0 14px 34px -18px rgba(22,19,15,0.16)"
            : "0 0 0 rgba(0,0,0,0)",
          padding: isExploded ? 10 : 0,
        }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
      >
        {children}

        {/* A hairline that confirms the piece has been read. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-accent/45"
          initial={false}
          animate={{ opacity: isScanning ? [0, 1, 1] : 0 }}
          transition={{
            duration: 0.9,
            delay: isScanning ? geometry.scanDelay : 0,
            ease: EASE_OUT,
            times: [0, 0.25, 1],
          }}
        />
      </motion.div>

      <AnimatePresence>
        {isScanning ? (
          <motion.span
            key={`${partKey}-${cycle}`}
            className={`absolute top-1/2 text-eyebrow font-medium uppercase text-accent ${
              geometry.labelSide === "left"
                ? "right-full mr-3 text-right"
                : "left-full ml-3"
            }`}
            initial={{ opacity: 0, x: geometry.labelSide === "left" ? 6 : -6 }}
            animate={{ opacity: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              delay: geometry.scanDelay,
              ease: EASE_OUT,
            }}
          >
            {geometry.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Capture brackets ──────────────────────────────────────────────────── */

const BRACKETS = [
  { corner: "M0,14 L0,0 L14,0", x: CARD.x - 10, y: CARD.y - 10 },
  { corner: "M0,0 L14,0 L14,14", x: CARD.x + CARD.w - 4, y: CARD.y - 10 },
  { corner: "M0,0 L0,14 L14,14", x: CARD.x - 10, y: CARD.y + CARD.h - 4 },
  { corner: "M14,0 L14,14 L0,14", x: CARD.x + CARD.w - 4, y: CARD.y + CARD.h - 4 },
];

function CaptureFrame({ cycle }: { cycle: number }) {
  return (
    <>
      {BRACKETS.map((bracket, index) => (
        <motion.svg
          key={`${index}-${cycle}`}
          className="absolute"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          style={{ left: bracket.x, top: bracket.y }}
          initial={{
            opacity: 0,
            x: index % 2 === 0 ? -10 : 10,
            y: index < 2 ? -10 : 10,
          }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE_OUT, delay: index * 0.04 }}
        >
          <path
            d={bracket.corner}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
          />
        </motion.svg>
      ))}

      {/* One clean sweep of light across the capture. No glow, no bloom. */}
      <motion.div
        key={`sweep-${cycle}`}
        className="absolute overflow-hidden rounded-[22px]"
        style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT, delay: 0.18 }}
      >
        <motion.div
          className="absolute inset-y-0 w-1/2"
          style={{
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.9), transparent)",
          }}
          initial={{ x: -CARD.w * 0.6 }}
          animate={{ x: CARD.w }}
          transition={{ duration: 0.9, ease: EASE_IN_OUT, delay: 0.18 }}
        />
      </motion.div>

      <motion.span
        key={`captured-${cycle}`}
        className="absolute text-eyebrow font-medium uppercase text-accent"
        style={{ left: CARD.x, top: CARD.y + CARD.h + 18 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.35 }}
      >
        Captured
      </motion.span>
    </>
  );
}

/* ── Measurement cards ────────────────────────────────────────────────── */

const MEASURES = [
  { label: "Trust", value: 89, left: 62, top: 158 },
  { label: "Authority", value: 72, left: 236, top: 236 },
  { label: "Visual Quality", value: 92, left: 104, top: 322 },
] as const;

function MeasureCard({
  label,
  value,
  left,
  top,
  index,
  counting,
}: {
  label: string;
  value: number;
  left: number;
  top: number;
  index: number;
  counting: boolean;
}) {
  return (
    <motion.div
      className="absolute w-[162px] rounded-[16px] bg-surface p-4 shadow-panel"
      style={{ left, top }}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay: index * 0.14 }}
    >
      <p className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-2 text-[28px] font-medium leading-none tracking-[-0.03em]">
        <CountUp value={value} active={counting} duration={1.2} />
      </p>
      <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: "0%" }}
          animate={{ width: counting ? `${value}%` : "0%" }}
          transition={{ duration: 1.3, ease: EASE_OUT }}
        />
      </div>
    </motion.div>
  );
}

/* ── Final report panel ───────────────────────────────────────────────── */

function ReportPanel({ active }: { active: boolean }) {
  const rows = [
    { label: "Trust", value: 89 },
    { label: "Authority", value: 72 },
    { label: "Visual Quality", value: 92 },
  ];

  return (
    <motion.div
      className="absolute rounded-[24px] bg-surface p-6 shadow-float"
      style={{ left: 74, top: 132, width: 312 }}
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.6, ease: EASE_IN_OUT } }}
      transition={{ duration: 0.9, ease: EASE_OUT }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-faint">
            First impression
          </p>
          <p className="mt-2 max-w-[150px] text-[13px] font-medium leading-snug tracking-[-0.015em]">
            Composed, quietly premium
          </p>
        </div>
        <ScoreRing
          value={84}
          size={72}
          thickness={2}
          active={active}
          delay={0.25}
          duration={1.3}
        >
          <span className="text-[22px] font-medium tracking-[-0.03em]">
            <CountUp value={84} active={active} delay={0.25} duration={1.3} />
          </span>
        </ScoreRing>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row, index) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[10.5px]">
              <span className="text-ink-muted">{row.label}</span>
              <span className="tabular font-medium">{row.value}</span>
            </div>
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: "0%" }}
                animate={{ width: active ? `${row.value}%` : "0%" }}
                transition={{
                  duration: 1.1,
                  ease: EASE_OUT,
                  delay: 0.35 + index * 0.12,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <motion.p
        className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-muted"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.85 }}
      >
        Read as credible in <span className="tabular text-ink">2.4s</span>. Nothing
        yet says what you do.
      </motion.p>
    </motion.div>
  );
}

/* ── The film ─────────────────────────────────────────────────────────── */

export function HeroCinematic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, stageInView);
  const reduced = useReducedMotionSafe();

  const clock = useCinematicClock(STEPS, {
    active: inView,
    reduced,
    restingId: "report",
  });

  const phase = clock.id;
  const isCapture = phase === "capture";
  const isScan = phase === "scan";
  const showMeasures = phase === "score" || phase === "collect";
  const showReport = phase === "report";
  const chromeVisible = phase === "enter" || phase === "capture";

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        label="An Instagram profile is captured, separated into its photo, bio, highlights and grid, read, and resolved into a perception report."
      >
        {/* Everything before the report lives in this group. */}
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: showReport || phase === "reset" ? 0 : 1,
          }}
          transition={{ duration: 0.7, ease: EASE_IN_OUT }}
        >
          {/* The screenshot's own surface. */}
          <motion.div
            className="absolute rounded-[22px] bg-surface"
            style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h }}
            initial={{ opacity: 0, y: 26, scale: 0.975 }}
            animate={{
              opacity: chromeVisible ? 1 : 0,
              y: 0,
              scale: isCapture ? 0.994 : 1,
              boxShadow: chromeVisible
                ? "0 2px 4px rgba(22,19,15,0.04), 0 32px 72px -32px rgba(22,19,15,0.18)"
                : "0 0 0 rgba(0,0,0,0)",
            }}
            transition={{ duration: 1.15, ease: EASE_OUT }}
          />

          {/* Chrome: present for the screenshot, discarded once it separates. */}
          <motion.div
            className="absolute"
            style={{ left: 96, top: 56, width: 268 }}
            animate={{ opacity: chromeVisible ? 1 : 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <MockStatusBar />
            <MockUsernameBar className="mt-3" />
          </motion.div>

          <motion.div
            className="absolute"
            style={{ left: 176, top: 112, width: 188 }}
            animate={{ opacity: chromeVisible ? 1 : 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <div className="flex items-center justify-around">
              {[
                { value: "128", label: "posts" },
                { value: "14.2k", label: "followers" },
                { value: "312", label: "following" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="tabular text-[13px] font-semibold leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[9.5px] leading-none text-ink-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="absolute"
            style={{ left: CARD.x, top: 319, width: CARD.w }}
            animate={{ opacity: chromeVisible ? 1 : 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <MockTabs />
          </motion.div>

          {/* The four things a stranger actually reacts to. */}
          <Part partKey="avatar" phase={phase} cycle={clock.cycle}>
            <MockAvatar size={64} />
          </Part>
          <Part partKey="bio" phase={phase} cycle={clock.cycle}>
            <MockBio />
          </Part>
          <Part partKey="highlights" phase={phase} cycle={clock.cycle}>
            <MockHighlights />
          </Part>
          <Part partKey="grid" phase={phase} cycle={clock.cycle}>
            <MockGrid rows={2} tile={88} gap={2} />
          </Part>

          <AnimatePresence>{isCapture ? <CaptureFrame cycle={clock.cycle} /> : null}</AnimatePresence>

          {/* The read. One line, travelling with weight. */}
          <AnimatePresence>
            {isScan ? (
              <motion.div
                key={`scanline-${clock.cycle}`}
                className="absolute left-0 right-0"
                initial={{ y: 76, opacity: 0 }}
                animate={{ y: 500, opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.2,
                  ease: EASE_IN_OUT,
                  opacity: { duration: 2.2, times: [0, 0.06, 0.86, 1] },
                }}
              >
                <div
                  className="h-14 w-full"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(190,67,37,0) 0%, rgba(190,67,37,0.05) 100%)",
                  }}
                />
                <div className="h-px w-full bg-accent/60" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* Measurements, then the report they resolve into. */}
        <AnimatePresence>
          {showMeasures
            ? MEASURES.map((measure, index) => (
                <MeasureCard
                  key={`${measure.label}-${clock.cycle}`}
                  {...measure}
                  index={index}
                  counting={phase === "score"}
                />
              ))
            : null}
        </AnimatePresence>

        <AnimatePresence>
          {showReport ? (
            <ReportPanel key={`report-${clock.cycle}`} active={showReport} />
          ) : null}
        </AnimatePresence>
      </Stage>
    </div>
  );
}
