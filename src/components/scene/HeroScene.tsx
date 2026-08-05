"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, type Transition } from "framer-motion";
import { Scene } from "@/components/scene/Scene";
import {
  SubjectAvatar,
  SubjectBio,
  SubjectCollections,
  SubjectGrid,
  SubjectHandle,
} from "@/components/profile/SubjectProfile";
import { CountUp } from "@/components/ui/CountUp";
import { ScoreDial } from "@/components/ui/ScoreDial";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useSceneClock } from "@/hooks/useSceneClock";
import { EASE_IN_OUT, EASE_OUT, sceneInView } from "@/lib/motion";

/**
 * The hero film.
 *
 * A profile arrives → it is captured → the screenshot separates into the four
 * things a stranger actually reacts to → each layer is read → the layers
 * reorganise into measurements → the measurements resolve into a report → it
 * resets and begins again.
 *
 * Nine beats, fourteen seconds. The product is explained here without a
 * sentence of copy.
 */

const W = 456;
const H = 566;

const BEATS = [
  { id: "arrive", duration: 1.5 },
  { id: "capture", duration: 1.2 },
  { id: "separate", duration: 1.7 },
  { id: "scan", duration: 2.2 },
  { id: "gather", duration: 1.1 },
  { id: "measure", duration: 1.7 },
  { id: "report", duration: 2.4 },
  { id: "reset", duration: 0.9 },
] as const;

type Beat = (typeof BEATS)[number]["id"];

/** The screenshot's frame, in scene coordinates. */
const CARD = { x: 80, y: 42, w: 296, h: 472 };

interface Layer {
  left: number;
  top: number;
  width: number;
  /** Where the layer travels once the screenshot separates. */
  out: { x: number; y: number; scale: number };
  /** Reading order during the scan. */
  at: number;
  label: string;
  side: "left" | "right";
}

const LAYERS = {
  avatar: {
    left: 96,
    top: 96,
    width: 62,
    out: { x: -44, y: -14, scale: 1.1 },
    at: 0.16,
    label: "Photo",
    side: "left",
  },
  bio: {
    left: 96,
    top: 176,
    width: 264,
    out: { x: 38, y: -46, scale: 0.94 },
    at: 0.6,
    label: "Bio",
    side: "right",
  },
  collections: {
    left: 96,
    top: 248,
    width: 264,
    out: { x: -38, y: -10, scale: 0.9 },
    at: 1.04,
    label: "Collections",
    side: "left",
  },
  grid: {
    left: 85,
    top: 336,
    width: 264,
    out: { x: 32, y: -18, scale: 0.85 },
    at: 1.48,
    label: "Posts",
    side: "right",
  },
} satisfies Record<string, Layer>;

type LayerKey = keyof typeof LAYERS;

const SETTLED = { x: 0, y: 0, scale: 1, opacity: 1 };

function layerState(key: LayerKey, beat: Beat) {
  const { out } = LAYERS[key];

  switch (beat) {
    case "arrive":
    case "capture":
      return SETTLED;
    case "separate":
    case "scan":
      return { ...out, opacity: 1 };
    case "gather":
      return { x: out.x * 0.2, y: out.y * 0.2, scale: 0.93, opacity: 0 };
    default:
      return { x: 0, y: 0, scale: 0.93, opacity: 0 };
  }
}

const TRANSITIONS: Record<string, Transition> = {
  separate: { duration: 1.45, ease: EASE_OUT },
  gather: { duration: 0.95, ease: EASE_IN_OUT },
  default: { duration: 0.75, ease: EASE_OUT },
};

function LayerBlock({
  layerKey,
  beat,
  cycle,
  children,
}: {
  layerKey: LayerKey;
  beat: Beat;
  cycle: number;
  children: ReactNode;
}) {
  const layer = LAYERS[layerKey];
  const detached = beat === "separate" || beat === "scan";
  const scanning = beat === "scan";

  const transition =
    beat === "separate"
      ? TRANSITIONS.separate
      : beat === "gather"
        ? TRANSITIONS.gather
        : TRANSITIONS.default;

  return (
    <motion.div
      className="absolute"
      style={{ left: layer.left, top: layer.top, width: layer.width }}
      animate={layerState(layerKey, beat)}
      transition={transition}
    >
      {/* Once detached, each layer sits on its own surface. */}
      <motion.div
        className="relative rounded-card"
        animate={{
          backgroundColor: detached ? "#ffffff" : "rgba(255,255,255,0)",
          boxShadow: detached
            ? "0 1px 2px rgba(12,13,16,0.04), 0 14px 32px -18px rgba(12,13,16,0.16)"
            : "0 0 0 rgba(0,0,0,0)",
          padding: detached ? 10 : 0,
        }}
        transition={{ duration: 0.85, ease: EASE_OUT }}
      >
        {children}

        {/* A ring that confirms the layer has been read. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-card ring-1 ring-accent/50"
          initial={false}
          animate={{ opacity: scanning ? [0, 1, 1] : 0 }}
          transition={{
            duration: 0.9,
            delay: scanning ? layer.at : 0,
            ease: EASE_OUT,
            times: [0, 0.25, 1],
          }}
        />
      </motion.div>

      <AnimatePresence>
        {scanning ? (
          <motion.span
            key={`${layerKey}-${cycle}`}
            className={`absolute top-1/2 text-label font-medium uppercase text-accent ${
              layer.side === "left" ? "right-full mr-3 text-right" : "left-full ml-3"
            }`}
            initial={{ opacity: 0, x: layer.side === "left" ? 5 : -5 }}
            animate={{ opacity: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: layer.at, ease: EASE_OUT }}
          >
            {layer.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Capture ────────────────────────────────────────────────────────────── */

const CORNERS = [
  { d: "M0,13 L0,0 L13,0", x: CARD.x - 9, y: CARD.y - 9 },
  { d: "M0,0 L13,0 L13,13", x: CARD.x + CARD.w - 4, y: CARD.y - 9 },
  { d: "M0,0 L0,13 L13,13", x: CARD.x - 9, y: CARD.y + CARD.h - 4 },
  { d: "M13,0 L13,13 L0,13", x: CARD.x + CARD.w - 4, y: CARD.y + CARD.h - 4 },
];

function Capture({ cycle }: { cycle: number }) {
  return (
    <>
      {CORNERS.map((corner, index) => (
        <motion.svg
          key={`${index}-${cycle}`}
          className="absolute"
          width="13"
          height="13"
          viewBox="0 0 13 13"
          style={{ left: corner.x, top: corner.y }}
          initial={{ opacity: 0, x: index % 2 === 0 ? -9 : 9, y: index < 2 ? -9 : 9 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: index * 0.04 }}
        >
          <path
            d={corner.d}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.6"
          />
        </motion.svg>
      ))}

      {/* One clean pass of light. No bloom, no flare. */}
      <motion.div
        key={`sweep-${cycle}`}
        className="absolute overflow-hidden rounded-panel"
        style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.85, ease: EASE_IN_OUT, delay: 0.16 }}
      >
        <motion.div
          className="absolute inset-y-0 w-1/2"
          style={{
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.92), transparent)",
          }}
          initial={{ x: -CARD.w * 0.6 }}
          animate={{ x: CARD.w }}
          transition={{ duration: 0.85, ease: EASE_IN_OUT, delay: 0.16 }}
        />
      </motion.div>

      <motion.span
        key={`shot-${cycle}`}
        className="absolute text-label font-medium uppercase text-accent"
        style={{ left: CARD.x, top: CARD.y + CARD.h + 16 }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.3 }}
      >
        Screenshot captured
      </motion.span>
    </>
  );
}

/* ── Measurements ───────────────────────────────────────────────────────── */

const CARDS = [
  { label: "Trust", value: 89, left: 58, top: 150 },
  { label: "Clarity", value: 64, left: 236, top: 232 },
  { label: "Visual quality", value: 93, left: 102, top: 318 },
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
      className="absolute w-[162px] rounded-card bg-white p-4 shadow-card ring-1 ring-edge"
      style={{ left, top }}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.45 } }}
      transition={{ duration: 0.75, ease: EASE_OUT, delay: index * 0.13 }}
    >
      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-4">
        {label}
      </p>
      <p className="display mt-2 text-[26px] font-medium leading-none tracking-[-0.035em]">
        <CountUp value={value} active={counting} duration={1.1} />
      </p>
      <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-edge">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: "0%" }}
          animate={{ width: counting ? `${value}%` : "0%" }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
        />
      </div>
    </motion.div>
  );
}

/* ── Final report ───────────────────────────────────────────────────────── */

function ReportCard({ active }: { active: boolean }) {
  const rows = [
    { label: "Trust", value: 89 },
    { label: "Authority", value: 71 },
    { label: "Clarity", value: 64 },
  ];

  return (
    <motion.div
      className="absolute rounded-panel bg-white p-6 shadow-raise ring-1 ring-edge"
      style={{ left: 72, top: 124, width: 312 }}
      initial={{ opacity: 0, y: 20, scale: 0.975 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.55, ease: EASE_IN_OUT } }}
      transition={{ duration: 0.85, ease: EASE_OUT }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.13em] text-ink-4">
            First impression
          </p>
          <p className="display mt-2 max-w-[142px] text-[15px] font-medium leading-snug tracking-[-0.02em]">
            Composed, quietly premium
          </p>
        </div>
        <ScoreDial value={82} size={70} thickness={4} active={active} delay={0.2} duration={1.2}>
          <span className="display text-[21px] font-medium tracking-[-0.035em]">
            <CountUp value={82} active={active} delay={0.2} duration={1.2} />
          </span>
        </ScoreDial>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((row, index) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[10.5px]">
              <span className="text-ink-3">{row.label}</span>
              <span className="tabular font-medium">{row.value}</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-edge">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: "0%" }}
                animate={{ width: active ? `${row.value}%` : "0%" }}
                transition={{ duration: 1, ease: EASE_OUT, delay: 0.3 + index * 0.11 }}
              />
            </div>
          </div>
        ))}
      </div>

      <motion.p
        className="mt-5 border-t border-edge pt-4 text-[11px] leading-relaxed text-ink-3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.8 }}
      >
        Believed in <span className="tabular text-ink">2.4s</span>. Nothing yet says
        what you do.
      </motion.p>
    </motion.div>
  );
}

/* ── The film ───────────────────────────────────────────────────────────── */

export function HeroScene() {
  const holder = useRef<HTMLDivElement>(null);
  const inView = useInView(holder, sceneInView);
  const reduced = useReducedMotionSafe();

  const clock = useSceneClock(BEATS, {
    active: inView,
    reduced,
    restingId: "report",
  });

  const beat = clock.id;
  const chrome = beat === "arrive" || beat === "capture";
  const showMeasures = beat === "gather" || beat === "measure";
  const showReport = beat === "report";

  return (
    <div ref={holder} className="w-full">
      <Scene
        width={W}
        height={H}
        label="A profile is captured, separated into its photo, bio, collections and posts, read layer by layer, and resolved into a perception report."
      >
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: showReport || beat === "reset" ? 0 : 1 }}
          transition={{ duration: 0.65, ease: EASE_IN_OUT }}
        >
          {/* The screenshot's own surface. */}
          <motion.div
            className="absolute rounded-panel bg-white"
            style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h }}
            initial={{ opacity: 0, y: 24, scale: 0.978 }}
            animate={{
              opacity: chrome ? 1 : 0,
              y: 0,
              scale: beat === "capture" ? 0.994 : 1,
              boxShadow: chrome
                ? "0 1px 2px rgba(12,13,16,0.04), 0 20px 48px -24px rgba(12,13,16,0.18)"
                : "0 0 0 rgba(0,0,0,0)",
            }}
            transition={{ duration: 1.1, ease: EASE_OUT }}
          />

          <motion.div
            className="absolute"
            style={{ left: 96, top: 62, width: 264 }}
            animate={{ opacity: chrome ? 1 : 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            <SubjectHandle />
          </motion.div>

          {/* Counts stay with the screenshot; they are context, not a layer. */}
          <motion.div
            className="absolute"
            style={{ left: 172, top: 104, width: 188 }}
            animate={{ opacity: chrome ? 1 : 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            <div className="flex items-center justify-around">
              {[
                { value: "128", label: "posts" },
                { value: "14.2k", label: "followers" },
                { value: "312", label: "following" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="tabular text-[12.5px] font-semibold leading-none">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[9px] leading-none text-ink-3">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* The four things a stranger reacts to. */}
          <LayerBlock layerKey="avatar" beat={beat} cycle={clock.cycle}>
            <SubjectAvatar size={62} />
          </LayerBlock>
          <LayerBlock layerKey="bio" beat={beat} cycle={clock.cycle}>
            <SubjectBio />
          </LayerBlock>
          <LayerBlock layerKey="collections" beat={beat} cycle={clock.cycle}>
            <SubjectCollections />
          </LayerBlock>
          <LayerBlock layerKey="grid" beat={beat} cycle={clock.cycle}>
            <SubjectGrid rows={2} tile={86} gap={2} />
          </LayerBlock>

          <AnimatePresence>
            {beat === "capture" ? <Capture cycle={clock.cycle} /> : null}
          </AnimatePresence>

          {/* The read. One line, travelling with weight. */}
          <AnimatePresence>
            {beat === "scan" ? (
              <motion.div
                key={`scan-${clock.cycle}`}
                className="absolute left-0 right-0"
                initial={{ y: 72, opacity: 0 }}
                animate={{ y: 486, opacity: [0, 1, 1, 0] }}
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
                      "linear-gradient(to bottom, rgba(27,74,255,0) 0%, rgba(27,74,255,0.07) 100%)",
                  }}
                />
                <div className="h-px w-full bg-accent/55" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {showMeasures
            ? CARDS.map((card, index) => (
                <MeasureCard
                  key={`${card.label}-${clock.cycle}`}
                  {...card}
                  index={index}
                  counting={beat === "measure"}
                />
              ))
            : null}
        </AnimatePresence>

        <AnimatePresence>
          {showReport ? <ReportCard key={`report-${clock.cycle}`} active /> : null}
        </AnimatePresence>
      </Scene>
    </div>
  );
}
