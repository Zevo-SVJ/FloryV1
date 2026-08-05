"use client";

import { useEffect, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ProfileCard } from "@/components/mock/ProfileParts";
import { LOADING_MESSAGES, MESSAGE_INTERVAL_MS } from "@/lib/loadingMessages";
import { ANALYSIS_DURATION_MS } from "@/lib/analysis";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";

/**
 * The wait.
 *
 * No spinner. The progress bar advances unevenly — quick where the work is
 * easy, slower where it is not — because a perfectly linear bar reads as
 * fake. Seven lines of copy, one every 700ms, and the screenshot is visibly
 * being read the entire time.
 */

interface AnalyzingSequenceProps {
  previewUrl: string | null;
}

export function AnalyzingSequence({ previewUrl }: AnalyzingSequenceProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const progress = useMotionValue(0);
  const width = useTransform(progress, (value) => `${value}%`);
  const readout = useTransform(progress, (value) => Math.round(value).toString());

  useEffect(() => {
    const controls = animate(progress, [0, 19, 34, 52, 67, 79, 91, 100], {
      duration: ANALYSIS_DURATION_MS / 1000,
      times: [0, 0.12, 0.26, 0.42, 0.58, 0.72, 0.88, 1],
      ease: EASE_IN_OUT,
    });

    return () => controls.stop();
  }, [progress]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((index) =>
        Math.min(index + 1, LOADING_MESSAGES.length - 1),
      );
    }, MESSAGE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="grid w-full items-center gap-12 md:grid-cols-[auto_1fr] md:gap-14 lg:gap-16"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      aria-live="polite"
      aria-busy
    >
      {/* What is being read. */}
      <div className="relative mx-auto overflow-hidden rounded-[20px] border border-line bg-surface shadow-panel md:mx-0">
        <div className="relative max-h-[260px] overflow-hidden">
          {previewUrl ? (
            // A blob: URL from the visitor's own file — see ReportHead.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="max-h-[260px] w-auto object-contain"
            />
          ) : (
            <div className="origin-top scale-[0.86]">
              <ProfileCard className="shadow-none" rows={1} />
            </div>
          )}

          {/* The read, passing over and over. */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0"
            animate={{ y: [-60, 300] }}
            transition={{
              duration: 2.1,
              repeat: Infinity,
              ease: EASE_IN_OUT,
              repeatDelay: 0.15,
            }}
          >
            <div
              className="h-16 w-full"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(190,67,37,0) 0%, rgba(190,67,37,0.07) 100%)",
              }}
            />
            <div className="h-px w-full bg-accent/50" />
          </motion.div>
        </div>
      </div>

      <div className="w-full max-w-lg">
        {/* What is being thought. The lines cross over each other rather than
            queueing, so nothing is ever mid-swap and blank. */}
        <div className="relative flex h-20 w-full items-center">
          <AnimatePresence initial={false}>
            <motion.p
              key={messageIndex}
              className="absolute inset-x-0 text-center text-lede font-medium tracking-[-0.015em] md:text-left"
              initial={{ opacity: 0, y: 14, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(5px)" }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* How far along. */}
        <div className="mt-6 w-full">
          <div className="h-px w-full overflow-hidden bg-line">
            <motion.div className="h-full bg-accent" style={{ width }} />
          </div>
          <div className="mt-4 flex items-baseline justify-between text-eyebrow font-medium uppercase text-ink-faint">
            <span className="tabular">
              {String(messageIndex + 1).padStart(2, "0")} /{" "}
              {String(LOADING_MESSAGES.length).padStart(2, "0")}
            </span>
            <span className="tabular">
              <motion.span>{readout}</motion.span>%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
