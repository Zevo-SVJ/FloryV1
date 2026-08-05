"use client";

import { useEffect, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { SubjectCard } from "@/components/profile/SubjectProfile";
import { IconCheck } from "@/components/ui/Icons";
import {
  MESSAGES,
  PIPELINE_DURATION_MS,
  STAGES,
  STAGE_MARKS,
  messageAt,
} from "@/lib/analysis/pipeline";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Row height of the stage reel, in pixels. */
const ROW = 26;

/**
 * Step two: the read.
 *
 * No spinner, because a spinner says "waiting" and this needs to say "working".
 * Thirteen stages complete in sequence against a single progress clock, the
 * screenshot is visibly being scanned the whole time, and the copy above it
 * changes as the work moves from detection into judgement.
 *
 * Progress is deliberately uneven — quick through the cheap detections, slower
 * through the ones that require a decision. A perfectly linear bar reads fake.
 */
export function PipelinePanel({
  previewUrl,
  titleId,
}: {
  previewUrl: string | null;
  titleId: string;
}) {
  const progress = useMotionValue(0);
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState(0);

  const percent = useTransform(progress, (value) => Math.round(value * 100).toString());
  const width = useTransform(progress, (value) => `${value * 100}%`);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: PIPELINE_DURATION_MS / 1000,
      ease: [0.42, 0, 0.3, 1],
    });
    return () => controls.stop();
  }, [progress]);

  useMotionValueEvent(progress, "change", (value) => {
    const reached = STAGE_MARKS.filter((mark) => value >= mark).length;
    setStage(reached);
    setMessage(messageAt(value));
  });

  // The line being worked on, with the two just finished above it.
  const current = Math.min(stage, STAGES.length - 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-8 pt-8 sm:px-9 sm:pb-10 sm:pt-12">
      <h2 id={titleId} className="sr-only">
        Analyzing your profile
      </h2>

      <div className="flex flex-1 flex-col items-center justify-start gap-7 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        {/* What is being read. */}
        <div className="relative shrink-0 overflow-hidden rounded-card ring-1 ring-edge">
          <div className="relative max-h-[26svh] overflow-hidden sm:max-h-[268px]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="max-h-[26svh] w-auto object-contain sm:max-h-[268px]"
              />
            ) : (
              <div className="h-[26svh] w-[208px] overflow-hidden sm:h-[268px]">
                <div className="origin-top-left scale-[0.7]">
                  <SubjectCard rows={2} className="shadow-none ring-0" />
                </div>
              </div>
            )}

            {/* The read, passing over and over. */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 top-0"
              animate={{ y: [-70, 320] }}
              transition={{
                duration: 1.9,
                repeat: Infinity,
                ease: EASE_IN_OUT,
                repeatDelay: 0.1,
              }}
            >
              <div
                className="h-16 w-full"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(27,74,255,0) 0%, rgba(27,74,255,0.09) 100%)",
                }}
              />
              <div className="h-px w-full bg-accent/60" />
            </motion.div>

            {/* Detection brackets, drifting to a new region on each stage. */}
            <Brackets stage={current} />
          </div>
        </div>

        {/* What is being thought. */}
        <div className="w-full max-w-sm">
          <div className="relative h-16">
            <AnimatePresence initial={false}>
              <motion.p
                key={message}
                className="display absolute inset-x-0 text-center text-[1.375rem] leading-tight tracking-[-0.028em] sm:text-left sm:text-[1.5rem]"
                initial={{ opacity: 0, y: 14, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(5px)" }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                {MESSAGES[message]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-5">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-edge">
              <motion.div className="h-full rounded-full bg-accent" style={{ width }} />
            </div>
            <div className="mt-3 flex items-baseline justify-between text-label font-medium uppercase text-ink-4">
              <span className="tabular">
                Stage {String(Math.min(stage + 1, STAGES.length)).padStart(2, "0")} /{" "}
                {STAGES.length}
              </span>
              <span className="tabular">
                <motion.span>{percent}</motion.span>%
              </span>
            </div>
          </div>

          {/* The working list, as a reel: the whole pipeline exists and the
              column travels, so lines never re-enter or flicker as they pass. */}
          <div className="relative mt-6 h-[5.25rem] overflow-hidden">
            <motion.ul
              className="absolute inset-x-0 top-0"
              animate={{ y: -(current * ROW) + ROW * 2 }}
              transition={{ duration: 0.42, ease: EASE_OUT }}
            >
              {STAGES.map((item, index) => {
                const distance = current - index;
                const done = index < stage;

                return (
                  <motion.li
                    key={item.id}
                    className="flex items-center gap-2.5"
                    style={{ height: ROW }}
                    animate={{
                      opacity:
                        distance < 0 ? 0 : distance === 0 ? 1 : distance === 1 ? 0.45 : 0.22,
                    }}
                    transition={{ duration: 0.42, ease: EASE_OUT }}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        done ? "bg-accent" : "bg-accent-tint",
                      )}
                    >
                      {done ? (
                        <IconCheck className="h-2.5 w-2.5 text-white" strokeWidth={2.8} />
                      ) : (
                        <motion.span
                          className="block h-1.5 w-1.5 rounded-full bg-accent"
                          animate={{ opacity: [1, 0.35, 1] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </span>
                    <span className="text-[0.875rem] text-ink-2">{item.label}</span>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Brackets that snap to a different part of the screenshot as the pipeline
 * moves through avatar, bio, collections and grid.
 */
const REGIONS = [
  { top: "6%", left: "6%", width: "88%", height: "88%" },
  { top: "12%", left: "8%", width: "26%", height: "20%" },
  { top: "36%", left: "8%", width: "84%", height: "16%" },
  { top: "54%", left: "8%", width: "84%", height: "14%" },
  { top: "70%", left: "6%", width: "88%", height: "26%" },
];

function Brackets({ stage }: { stage: number }) {
  const region = REGIONS[Math.min(Math.floor(stage / 3), REGIONS.length - 1)]!;

  return (
    <motion.div
      className="pointer-events-none absolute"
      animate={region}
      transition={{ duration: 0.7, ease: EASE_IN_OUT }}
    >
      {[
        "left-0 top-0 border-l border-t rounded-tl-[4px]",
        "right-0 top-0 border-r border-t rounded-tr-[4px]",
        "left-0 bottom-0 border-l border-b rounded-bl-[4px]",
        "right-0 bottom-0 border-r border-b rounded-br-[4px]",
      ].map((corner) => (
        <span key={corner} className={cn("absolute h-3 w-3 border-accent", corner)} />
      ))}
    </motion.div>
  );
}
