"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Scene } from "@/components/scene/Scene";
import {
  SubjectAvatar,
  SubjectBio,
  SubjectGrid,
  SubjectHandle,
} from "@/components/profile/SubjectProfile";
import { IconCheck } from "@/components/ui/Icons";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { useSceneClock } from "@/hooks/useSceneClock";
import { EASE_OUT, sceneInView } from "@/lib/motion";

/**
 * Story two.
 *
 * Three small changes land one at a time — the photo, the first line, the grid
 * — and the scores answer each one. The scene is about cause and effect, so the
 * numbers move in three distinct steps rather than one smooth sweep.
 */

const W = 552;
const H = 452;

const BEATS = [
  { id: "before", duration: 1.8 },
  { id: "photo", duration: 1.05 },
  { id: "line", duration: 1.05 },
  { id: "grid", duration: 1.15 },
  { id: "after", duration: 2.6 },
  { id: "reset", duration: 0.8 },
] as const;

type Beat = (typeof BEATS)[number]["id"];

/** [before, after photo, after line, after grid] */
const TRACKS = [
  { label: "Trust", track: [58, 69, 81, 91] },
  { label: "Authority", track: [47, 53, 73, 80] },
  { label: "Visual quality", track: [54, 61, 65, 89] },
] as const;

const CHANGES = [
  { label: "Profile photo replaced" },
  { label: "First line rewritten" },
  { label: "Grid re-graded to one temperature" },
] as const;

function stepFor(beat: Beat): number {
  switch (beat) {
    case "photo":
      return 1;
    case "line":
      return 2;
    case "grid":
    case "after":
      return 3;
    default:
      return 0;
  }
}

/**
 * A number that moves from wherever it is to a new target — so three
 * improvements read as three nudges, not one animation.
 */
function StepNumber({ target, className }: { target: number; className?: string }) {
  const reduced = useReducedMotionSafe();
  const value = useMotionValue(target);
  const text = useTransform(value, (latest) => Math.round(latest).toString());

  useEffect(() => {
    if (reduced) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [reduced, target, value]);

  return <motion.span className={className}>{text}</motion.span>;
}

/** Crossfades two versions of the same element in place. */
function Swap({
  flipped,
  before,
  after,
}: {
  flipped: boolean;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <div className="grid">
      <motion.div
        className="[grid-area:1/1]"
        animate={{ opacity: flipped ? 0 : 1 }}
        transition={{ duration: 0.65, ease: EASE_OUT }}
      >
        {before}
      </motion.div>
      <motion.div
        className="[grid-area:1/1]"
        animate={{ opacity: flipped ? 1 : 0 }}
        transition={{ duration: 0.65, ease: EASE_OUT }}
      >
        {after}
      </motion.div>
    </div>
  );
}

export function ShiftScene() {
  const holder = useRef<HTMLDivElement>(null);
  const inView = useInView(holder, sceneInView);
  const reduced = useReducedMotionSafe();

  const clock = useSceneClock(BEATS, {
    active: inView,
    reduced,
    restingId: "after",
  });

  const beat = clock.id;
  const step = stepFor(beat);
  const isAfter = beat === "after";
  const state = isAfter ? "After" : step > 0 ? "Changing" : "Before";

  return (
    <div ref={holder} className="w-full">
      <Scene
        width={W}
        height={H}
        label="A profile receives three small changes — a new photo, a rewritten first line, a re-graded grid — and its trust score rises from 58 to 91."
      >
        {/* The profile, quietly improving. */}
        <motion.div
          className="absolute w-[200px] overflow-hidden rounded-panel bg-white shadow-card ring-1 ring-edge"
          style={{ left: 16, top: 58 }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: beat === "reset" ? 0 : 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE_OUT }}
        >
          <div className="px-3.5 pt-3">
            <Swap
              flipped={step >= 2}
              before={<SubjectHandle quality="weak" />}
              after={<SubjectHandle quality="strong" />}
            />
          </div>

          <div className="flex items-center gap-3 px-3.5 pt-3">
            <Swap
              flipped={step >= 1}
              before={<SubjectAvatar size={44} quality="weak" />}
              after={<SubjectAvatar size={44} quality="strong" />}
            />
            <div className="flex-1">
              <div className="tabular text-[11px] font-semibold leading-none">9,481</div>
              <div className="mt-1 text-[8.5px] leading-none text-ink-3">followers</div>
            </div>
          </div>

          <div className="px-3.5 pb-3 pt-3">
            <Swap
              flipped={step >= 2}
              before={<SubjectBio quality="weak" />}
              after={<SubjectBio quality="strong" />}
            />
          </div>

          <div className="pb-3.5">
            <Swap
              flipped={step >= 3}
              before={
                <SubjectGrid quality="weak" rows={2} tile={60} gap={1} className="mx-auto" />
              }
              after={
                <SubjectGrid quality="strong" rows={2} tile={60} gap={1} className="mx-auto" />
              }
            />
          </div>
        </motion.div>

        {/* What the changes did. */}
        <motion.div
          className="absolute"
          style={{ left: 262, top: 40, width: 274 }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: beat === "reset" ? 0 : 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.12 }}
        >
          <div className="flex h-4 items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={state}
                className={
                  isAfter
                    ? "text-label font-medium uppercase text-accent"
                    : "text-label font-medium uppercase text-ink-4"
                }
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                {state}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* The headline metric. */}
          <div className="mt-4">
            <div className="flex items-end justify-between">
              <span className="text-[12.5px] text-ink-3">{TRACKS[0]!.label}</span>
              <AnimatePresence>
                {isAfter ? (
                  <motion.span
                    className="text-[11px] font-semibold tracking-tight text-accent"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
                  >
                    +33
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <p className="display mt-1 text-[80px] font-medium leading-[0.9] tracking-[-0.05em]">
              <StepNumber target={TRACKS[0]!.track[step]!} className="tabular" />
            </p>
            <div className="mt-3 h-[4px] w-full overflow-hidden rounded-full bg-edge">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${TRACKS[0]!.track[step]!}%` }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            </div>
          </div>

          {/* Supporting metrics. */}
          <div className="mt-7 space-y-4">
            {TRACKS.slice(1).map((metric) => (
              <div key={metric.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-ink-3">{metric.label}</span>
                  <span className="display text-[15px] font-medium tracking-tight">
                    <StepNumber target={metric.track[step]!} className="tabular" />
                  </span>
                </div>
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-edge">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    animate={{ width: `${metric.track[step]!}%` }}
                    transition={{ duration: 0.9, ease: EASE_OUT }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* The changes, ticking off as they land. */}
          <ul className="mt-7 space-y-2.5 border-t border-edge pt-5">
            {CHANGES.map((change, index) => {
              const done = step >= index + 1;

              return (
                <li key={change.label} className="flex items-center gap-2.5">
                  <motion.span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1"
                    animate={{
                      backgroundColor: done ? "var(--color-accent)" : "rgba(0,0,0,0)",
                      boxShadow: done
                        ? "0 0 0 1px var(--color-accent)"
                        : "0 0 0 1px var(--color-edge-strong)",
                    }}
                    style={{ ["--tw-ring-color" as string]: "transparent" }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  >
                    <motion.span
                      animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.6 }}
                      transition={{ duration: 0.35, ease: EASE_OUT }}
                    >
                      <IconCheck className="h-2.5 w-2.5 text-white" strokeWidth={2.8} />
                    </motion.span>
                  </motion.span>
                  <motion.span
                    className="text-[11.5px] leading-snug"
                    animate={{ color: done ? "var(--color-ink)" : "var(--color-ink-4)" }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  >
                    {change.label}
                  </motion.span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </Scene>
    </div>
  );
}
