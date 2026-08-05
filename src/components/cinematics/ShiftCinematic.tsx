"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Stage } from "@/components/stage/Stage";
import {
  MockAvatar,
  MockBio,
  MockGrid,
  MockUsernameBar,
} from "@/components/mock/ProfileParts";
import { IconCheck } from "@/components/ui/Icons";
import { useCinematicClock } from "@/hooks/useCinematicClock";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { EASE_OUT, stageInView } from "@/lib/motion";

/**
 * Section three.
 *
 * Three small changes are made to a profile — the photo, the first line, the
 * grid — and the scores move as each one lands. The point of the scene is
 * cause and effect: nothing improves on its own.
 */

const STAGE_WIDTH = 560;
const STAGE_HEIGHT = 470;

const STEPS = [
  { id: "before", duration: 1.9 },
  { id: "fix-photo", duration: 1.05 },
  { id: "fix-bio", duration: 1.05 },
  { id: "fix-grid", duration: 1.15 },
  { id: "after", duration: 2.7 },
  { id: "reset", duration: 0.9 },
] as const;

type Phase = (typeof STEPS)[number]["id"];

/** [before, after photo, after bio, after grid] */
const METRICS = [
  { label: "Trust", track: [61, 71, 82, 92] },
  { label: "Authority", track: [48, 54, 74, 81] },
  { label: "Visual Quality", track: [55, 62, 66, 90] },
] as const;

const FIXES = [
  { phase: "fix-photo", label: "Profile photo replaced" },
  { phase: "fix-bio", label: "First line rewritten" },
  { phase: "fix-grid", label: "Grid re-graded to one temperature" },
] as const;

function stageIndex(phase: Phase): number {
  switch (phase) {
    case "fix-photo":
      return 1;
    case "fix-bio":
      return 2;
    case "fix-grid":
    case "after":
      return 3;
    default:
      return 0;
  }
}

/**
 * A number that moves from wherever it currently is to a new target — so the
 * three improvements read as three distinct nudges, not one animation.
 */
function StagedNumber({ target, className }: { target: number; className?: string }) {
  const reduced = useReducedMotion();
  const value = useMotionValue(target);
  const text = useTransform(value, (latest) => Math.round(latest).toString());

  useEffect(() => {
    if (reduced) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, { duration: 0.95, ease: EASE_OUT });
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
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        {before}
      </motion.div>
      <motion.div
        className="[grid-area:1/1]"
        animate={{ opacity: flipped ? 1 : 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        {after}
      </motion.div>
    </div>
  );
}

export function ShiftCinematic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, stageInView);
  const reduced = useReducedMotionSafe();

  const clock = useCinematicClock(STEPS, {
    active: inView,
    reduced,
    restingId: "after",
  });

  const phase = clock.id;
  const index = stageIndex(phase);
  const isAfter = phase === "after";

  // Before → Changing → After. The middle state matters: the numbers are
  // moving while the label says so.
  const stateLabel = isAfter ? "After" : index > 0 ? "Changing" : "Before";

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        label="A profile receives three small changes — a new photo, a rewritten first line, a re-graded grid — and its trust score rises from 61 to 92."
      >
        {/* The profile, quietly improving. */}
        <motion.div
          className="absolute w-[204px] overflow-hidden rounded-[20px] bg-surface shadow-panel"
          style={{ left: 20, top: 64 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: phase === "reset" ? 0 : 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        >
          <div className="px-3.5 pt-3">
            <Swap
              flipped={index >= 2}
              before={<MockUsernameBar variant="raw" />}
              after={<MockUsernameBar variant="polished" />}
            />
          </div>

          <div className="flex items-center gap-3 px-3.5 pt-3">
            <Swap
              flipped={index >= 1}
              before={<MockAvatar size={46} variant="raw" />}
              after={<MockAvatar size={46} variant="polished" />}
            />
            <div className="flex-1">
              <div className="tabular text-[11px] font-semibold leading-none">
                9,481
              </div>
              <div className="mt-1 text-[9px] leading-none text-ink-muted">
                followers
              </div>
            </div>
          </div>

          <div className="px-3.5 pb-3 pt-3">
            <Swap
              flipped={index >= 2}
              before={<MockBio variant="raw" />}
              after={<MockBio variant="polished" />}
            />
          </div>

          <div className="pb-3.5">
            <Swap
              flipped={index >= 3}
              before={
                <MockGrid variant="raw" rows={2} tile={62} gap={1} className="mx-auto" />
              }
              after={
                <MockGrid
                  variant="polished"
                  rows={2}
                  tile={62}
                  gap={1}
                  className="mx-auto"
                />
              }
            />
          </div>
        </motion.div>

        {/* What the change did. */}
        <motion.div
          className="absolute"
          style={{ left: 268, top: 44, width: 272 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: phase === "reset" ? 0 : 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 }}
        >
          <div className="flex h-4 items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={stateLabel}
                className={
                  isAfter
                    ? "text-eyebrow font-medium uppercase text-accent"
                    : "text-eyebrow font-medium uppercase text-ink-faint"
                }
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              >
                {stateLabel}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* The headline metric. */}
          <div className="mt-5">
            <div className="flex items-end justify-between">
              <span className="text-[13px] text-ink-muted">
                {METRICS[0]!.label}
              </span>
              <AnimatePresence>
                {isAfter ? (
                  <motion.span
                    className="text-[11px] font-medium tracking-tight text-accent"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
                  >
                    +31
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <p className="mt-1 text-[84px] font-medium leading-[0.9] tracking-[-0.045em]">
              <StagedNumber
                target={METRICS[0]!.track[index]!}
                className="tabular"
              />
            </p>
            <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${METRICS[0]!.track[index]!}%` }}
                transition={{ duration: 0.95, ease: EASE_OUT }}
              />
            </div>
          </div>

          {/* Supporting metrics. */}
          <div className="mt-8 space-y-5">
            {METRICS.slice(1).map((metric) => (
              <div key={metric.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-ink-muted">{metric.label}</span>
                  <span className="text-[15px] font-medium tracking-tight">
                    <StagedNumber
                      target={metric.track[index]!}
                      className="tabular"
                    />
                  </span>
                </div>
                <div className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    animate={{ width: `${metric.track[index]!}%` }}
                    transition={{ duration: 0.95, ease: EASE_OUT }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* The three changes, ticking off as they happen. */}
          <ul className="mt-9 space-y-3 border-t border-line pt-6">
            {FIXES.map((fix, fixIndex) => {
              const applied = index >= fixIndex + 1;

              return (
                <li key={fix.label} className="flex items-center gap-2.5">
                  <motion.span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                    animate={{
                      borderColor: applied
                        ? "var(--color-accent)"
                        : "var(--color-line-strong)",
                      backgroundColor: applied
                        ? "var(--color-accent)"
                        : "rgba(0,0,0,0)",
                    }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  >
                    <motion.span
                      animate={{ opacity: applied ? 1 : 0, scale: applied ? 1 : 0.6 }}
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                    >
                      <IconCheck className="h-2.5 w-2.5 text-white" strokeWidth={2.6} />
                    </motion.span>
                  </motion.span>
                  <motion.span
                    className="text-[12px] leading-snug"
                    animate={{
                      color: applied ? "var(--color-ink)" : "var(--color-ink-faint)",
                    }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  >
                    {fix.label}
                  </motion.span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </Stage>
    </div>
  );
}
