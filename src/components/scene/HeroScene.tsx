"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useInView } from "framer-motion";
import { Scene } from "@/components/scene/Scene";
import {
  AbstractAvatar,
  AbstractBio,
  AbstractCollections,
  AbstractCounts,
  AbstractHandle,
} from "@/components/profile/AbstractProfile";
import { SubjectGrid } from "@/components/profile/SubjectProfile";
import { CountUp } from "@/components/ui/CountUp";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useSceneClock } from "@/hooks/useSceneClock";
import { EASE_IN_OUT, EASE_OUT, MORPH, sceneInView } from "@/lib/motion";

/**
 * The hero film.
 *
 * A profile is captured, comes apart into the four things a stranger reacts to,
 * is read, and resolves into a report — and then folds back up and starts again.
 *
 * The rule the whole film is built on: **nothing appears and nothing
 * disappears.** There are exactly five moving objects on stage for the entire
 * fourteen seconds. The plate becomes the report. Each fragment becomes its own
 * score. When the scores leave, they travel into the report rather than fading
 * out where they stand. Every box change is a layout morph on a node that was
 * already there, and every content change is a crossfade inside that node while
 * its frame is already travelling — so the eye is always following an object,
 * never catching a cut.
 *
 * The fragments are abstract on purpose. A real sentence inside an animation
 * stops the choreography dead while it is read; a measure does not.
 */

const W = 456;
const H = 566;

const BEATS = [
  { id: "assemble", duration: 1.7 },
  { id: "capture", duration: 1.2 },
  { id: "separate", duration: 1.7 },
  { id: "read", duration: 2.2 },
  { id: "measure", duration: 2 },
  { id: "resolve", duration: 1.2 },
  { id: "report", duration: 2.6 },
  { id: "return", duration: 1.2 },
] as const;

type Beat = (typeof BEATS)[number]["id"];

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The screenshot's own surface, and what it later becomes. */
const PLATE: Frame = { x: 80, y: 42, w: 296, h: 472 };
const REPORT: Frame = { x: 68, y: 140, w: 320, h: 288 };

type FragmentKey = "photo" | "bio" | "collections" | "grid";

const FRAGMENTS: FragmentKey[] = ["photo", "bio", "collections", "grid"];

/** Where each fragment sits in each act. Four boxes, four lives. */
const FRAMES: Record<FragmentKey, Record<"placed" | "detached" | "scored", Frame>> = {
  photo: {
    placed: { x: 96, y: 152, w: 62, h: 62 },
    detached: { x: 52, y: 132, w: 82, h: 82 },
    scored: { x: 56, y: 96, w: 160, h: 104 },
  },
  bio: {
    placed: { x: 96, y: 236, w: 264, h: 46 },
    detached: { x: 130, y: 216, w: 284, h: 66 },
    scored: { x: 240, y: 96, w: 160, h: 104 },
  },
  collections: {
    placed: { x: 96, y: 306, w: 264, h: 58 },
    detached: { x: 56, y: 296, w: 284, h: 78 },
    scored: { x: 56, y: 230, w: 160, h: 104 },
  },
  grid: {
    placed: { x: 85, y: 386, w: 264, h: 174 },
    detached: { x: 114, y: 372, w: 284, h: 194 },
    scored: { x: 240, y: 230, w: 160, h: 104 },
  },
};

/** Where they go when the report absorbs them. */
const ABSORBED: Frame = {
  x: REPORT.x + REPORT.w / 2 - 30,
  y: REPORT.y + REPORT.h / 2 - 20,
  w: 60,
  h: 40,
};

const SCORES: Record<FragmentKey, { label: string; value: number }> = {
  photo: { label: "Trust", value: 86 },
  bio: { label: "Clarity", value: 58 },
  collections: { label: "Consistency", value: 88 },
  grid: { label: "Visual quality", value: 91 },
};

/** Reading order during the pass, in seconds from the start of the beat. */
const READ_AT: Record<FragmentKey, number> = {
  photo: 0.24,
  bio: 0.78,
  collections: 1.22,
  grid: 1.66,
};

function frameFor(key: FragmentKey, beat: Beat): Frame {
  switch (beat) {
    case "assemble":
    case "capture":
    case "return":
      return FRAMES[key].placed;
    case "separate":
    case "read":
      return FRAMES[key].detached;
    case "measure":
      return FRAMES[key].scored;
    default:
      return ABSORBED;
  }
}

const asStyle = (frame: Frame) => ({
  left: frame.x,
  top: frame.y,
  width: frame.w,
  height: frame.h,
});

export function HeroScene() {
  const holder = useRef<HTMLDivElement>(null);
  const inView = useInView(holder, sceneInView);
  const reduced = useReducedMotionSafe();

  const clock = useSceneClock(BEATS, {
    active: inView,
    reduced,
    restingId: "report",
  });

  const beat = clock.id as Beat;
  const onPlate = beat === "assemble" || beat === "capture" || beat === "return";
  const lifted = beat === "separate" || beat === "read";
  const scoring = beat === "measure";
  const absorbing = beat === "resolve" || beat === "report";
  const reporting = beat === "report";

  return (
    <div ref={holder} className="w-full">
      <Scene
        width={W}
        height={H}
        label="A profile is captured, separated into its photo, bio, collections and posts, read one layer at a time, scored, and folded into a perception report."
      >
        {/* ── The plate. It is the screenshot, and then it is the report. ── */}
        <motion.div
          className="absolute z-[2] overflow-hidden bg-white"
          animate={{
            ...asStyle(onPlate ? PLATE : absorbing ? REPORT : PLATE),
            borderRadius: absorbing ? 26 : 30,
            /* Never fully gone: while the fragments are out on their own it
               recedes to a ghost of itself, still occupying its place. */
            opacity: lifted || scoring ? 0.16 : 1,
            scale: beat === "capture" ? 0.994 : 1,
            boxShadow:
              lifted || scoring
                ? "0 0 0 rgba(0,0,0,0)"
                : "0 1px 2px rgba(8,24,84,0.05), 0 22px 52px -24px rgba(8,24,84,0.2)",
          }}
          transition={MORPH}
        >
          <PlateHeader visible={onPlate} />
          <ReportContents visible={absorbing} counting={reporting} />
        </motion.div>

        {/* ── The four fragments. Same nodes throughout. ── */}
        {FRAGMENTS.map((key) => (
          <FragmentNode
            key={key}
            fragmentKey={key}
            beat={beat}
            cycle={clock.cycle}
            lifted={lifted}
            scoring={scoring}
            absorbing={absorbing}
          />
        ))}

        {/* ── The capture, and the read. The only two transient effects, and
               both are passes of light across objects that stay put. ── */}
        <AnimatePresence>
          {beat === "capture" ? <Capture cycle={clock.cycle} /> : null}
        </AnimatePresence>

        <AnimatePresence>
          {beat === "read" ? (
            <motion.div
              key={`read-${clock.cycle}`}
              className="absolute left-0 right-0"
              initial={{ y: 96, opacity: 0 }}
              animate={{ y: 540, opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.2,
                ease: EASE_IN_OUT,
                opacity: { duration: 2.2, times: [0, 0.06, 0.86, 1] },
              }}
            >
              <div
                className="h-16 w-full"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(11,92,251,0) 0%, rgba(11,92,251,0.09) 100%)",
                }}
              />
              <div className="h-px w-full bg-accent/55" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Scene>
    </div>
  );
}

/* ── One fragment, through its whole life ─────────────────────────────────── */

function FragmentNode({
  fragmentKey,
  beat,
  cycle,
  lifted,
  scoring,
  absorbing,
}: {
  fragmentKey: FragmentKey;
  beat: Beat;
  cycle: number;
  lifted: boolean;
  scoring: boolean;
  absorbing: boolean;
}) {
  const frame = frameFor(fragmentKey, beat);
  const score = SCORES[fragmentKey];
  const onSurface = lifted || scoring;

  return (
    <motion.div
      className="absolute"
      animate={{
        ...asStyle(frame),
        /* Absorbed rather than deleted: it shrinks into the report's middle and
           is covered by it, which is what merging looks like. */
        opacity: absorbing ? 0 : 1,
        scale: absorbing ? 0.7 : 1,
      }}
      transition={MORPH}
      style={{ zIndex: absorbing ? 1 : 3 }}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden"
        animate={{
          backgroundColor: onSurface ? "#ffffff" : "rgba(255,255,255,0)",
          borderRadius: 18,
          padding: onSurface ? 10 : 0,
          boxShadow: onSurface
            ? "0 1px 2px rgba(8,24,84,0.05), 0 14px 32px -18px rgba(8,24,84,0.18)"
            : "0 0 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.85, ease: EASE_OUT }}
      >
        {/* Both contents are always mounted. The box travels; the interior
            hands over inside it. Neither is ever alone on screen. */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center p-[10px]"
          animate={{ opacity: scoring || absorbing ? 0 : 1 }}
          transition={{ duration: 0.5, ease: EASE_IN_OUT }}
        >
          <FragmentContent fragmentKey={fragmentKey} />
        </motion.div>

        <motion.div
          className="absolute inset-0 flex flex-col justify-center px-4"
          animate={{ opacity: scoring ? 1 : 0 }}
          transition={{ duration: 0.5, delay: scoring ? 0.25 : 0, ease: EASE_IN_OUT }}
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-4">
            {score.label}
          </p>
          <p className="display mt-2 text-[26px] font-medium leading-none tracking-[-0.04em]">
            <CountUp value={score.value} active={scoring} duration={1.1} />
          </p>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-edge">
            <motion.div
              className="brand-gradient h-full rounded-full"
              initial={false}
              animate={{ width: scoring ? `${score.value}%` : "0%" }}
              transition={{ duration: 1.2, ease: EASE_OUT }}
            />
          </div>
        </motion.div>

        {/* The confirmation that this layer has been read. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-accent/50"
          initial={false}
          animate={{ opacity: beat === "read" ? [0, 1, 1] : 0 }}
          transition={{
            duration: 0.9,
            delay: beat === "read" ? READ_AT[fragmentKey] : 0,
            ease: EASE_OUT,
            times: [0, 0.25, 1],
          }}
          key={`ring-${cycle}`}
        />
      </motion.div>
    </motion.div>
  );
}

function FragmentContent({ fragmentKey }: { fragmentKey: FragmentKey }): ReactNode {
  if (fragmentKey === "photo") return <AbstractAvatar size={62} />;
  if (fragmentKey === "bio") return <AbstractBio className="w-full" />;
  if (fragmentKey === "collections") return <AbstractCollections />;
  return <SubjectGrid rows={2} tile={86} gap={2} />;
}

/* ── What the plate holds ─────────────────────────────────────────────────── */

/**
 * The part of the profile that is context rather than a layer.
 *
 * The handle and the counts stay with the plate when the four fragments leave,
 * because nobody forms an impression of a follower count — they form it of the
 * face, the words, the collections and the work.
 */
function PlateHeader({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-0 px-4 pt-5"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.55, ease: EASE_IN_OUT }}
    >
      <AbstractHandle />
      <AbstractCounts className="mt-6" />
    </motion.div>
  );
}

const ROWS = [
  { label: "Trust", value: 86 },
  { label: "Clarity", value: 58 },
  { label: "Visual quality", value: 91 },
];

/**
 * The report's interior, inside the plate that used to be the screenshot.
 *
 * It fades up while its container is already travelling and resizing, so the
 * change reads as the plate turning into a report rather than a report being
 * dealt on top of one.
 */
function ReportContents({
  visible,
  counting,
}: {
  visible: boolean;
  counting: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0 p-6"
      /* Arrives while the plate is still travelling, so the plate is never a
         blank white card waiting for its contents. */
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.7, ease: EASE_IN_OUT }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.13em] text-ink-4">
            First impression
          </p>
          <div className="mt-3 space-y-[6px]">
            <span className="block h-[8px] w-[104px] rounded-full bg-ink-2" />
            <span className="block h-[8px] w-[72px] rounded-full bg-edge-strong" />
          </div>
        </div>

        <div className="display flex items-start">
          <span className="text-[42px] font-semibold leading-none tracking-[-0.05em]">
            <CountUp value={78} active={counting} duration={1.3} />
          </span>
          <span className="mt-1.5 text-[11px] font-medium text-ink-4">/100</span>
        </div>
      </div>

      <div className="mt-6 space-y-3.5">
        {ROWS.map((row, index) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[10.5px]">
              <span className="text-ink-3">{row.label}</span>
              <span className="tabular font-medium">{row.value}</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-edge">
              <motion.div
                className="brand-gradient h-full rounded-full"
                initial={false}
                animate={{ width: counting ? `${row.value}%` : "0%" }}
                transition={{ duration: 1, ease: EASE_OUT, delay: 0.5 + index * 0.11 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-edge pt-4">
        <div className="space-y-[6px]">
          <span className="block h-[5px] w-full rounded-full bg-edge-strong" />
          <span className="block h-[5px] w-[62%] rounded-full bg-edge" />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Capture ──────────────────────────────────────────────────────────────── */

const CORNERS = [
  { d: "M0,13 L0,0 L13,0", x: PLATE.x - 9, y: PLATE.y - 9 },
  { d: "M0,0 L13,0 L13,13", x: PLATE.x + PLATE.w - 4, y: PLATE.y - 9 },
  { d: "M0,0 L0,13 L13,13", x: PLATE.x - 9, y: PLATE.y + PLATE.h - 4 },
  { d: "M13,0 L13,13 L0,13", x: PLATE.x + PLATE.w - 4, y: PLATE.y + PLATE.h - 4 },
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
          style={{ left: corner.x, top: corner.y, zIndex: 4 }}
          initial={{ opacity: 0, x: index % 2 === 0 ? -9 : 9, y: index < 2 ? -9 : 9 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: index * 0.04 }}
        >
          <path d={corner.d} fill="none" stroke="var(--color-accent)" strokeWidth="1.6" />
        </motion.svg>
      ))}

      {/* One clean pass of light. No bloom, no flare. */}
      <motion.div
        key={`sweep-${cycle}`}
        className="absolute overflow-hidden rounded-panel"
        style={{ left: PLATE.x, top: PLATE.y, width: PLATE.w, height: PLATE.h, zIndex: 4 }}
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
          initial={{ x: -PLATE.w * 0.6 }}
          animate={{ x: PLATE.w }}
          transition={{ duration: 0.85, ease: EASE_IN_OUT, delay: 0.16 }}
        />
      </motion.div>
    </>
  );
}
