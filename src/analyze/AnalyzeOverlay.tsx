"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { PipelinePanel } from "@/analyze/PipelinePanel";
import { ReportPanel } from "@/analyze/ReportPanel";
import { Sheet } from "@/analyze/Sheet";
import { UploadPanel } from "@/analyze/UploadPanel";
import { Button } from "@/components/ui/Button";
import { EASE_OUT } from "@/lib/motion";

const TITLE_ID = "analyze-flow-title";

/**
 * The flow, mounted once at the root.
 *
 * Upload, read and report are three states of one surface rather than three
 * pages — the sheet stays put and its contents cross over, which is why the
 * whole thing reads as an app instead of a series of screens.
 */
export function AnalyzeOverlay() {
  const { phase, previewUrl, report, message, close, again } = useAnalyze();
  const isOpen = phase !== "closed";
  const wide = phase === "running" || phase === "report";

  return (
    <AnimatePresence>
      {isOpen ? (
        <Sheet
          key="sheet"
          onClose={close}
          labelledBy={TITLE_ID}
          wide={wide}
          fill={phase === "report"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === "upload" ? (
              <motion.div
                key="upload"
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <UploadPanel titleId={TITLE_ID} />
              </motion.div>
            ) : null}

            {phase === "running" ? (
              <motion.div
                key="running"
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <PipelinePanel previewUrl={previewUrl} titleId={TITLE_ID} />
              </motion.div>
            ) : null}

            {phase === "report" && report ? (
              <motion.div
                key="report"
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: EASE_OUT }}
              >
                <ReportPanel
                  report={report}
                  previewUrl={previewUrl}
                  titleId={TITLE_ID}
                />
              </motion.div>
            ) : null}

            {phase === "error" ? (
              <motion.div
                key="error"
                className="flex min-h-0 flex-1 flex-col items-start justify-center gap-5 px-6 py-16 sm:px-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <h2 id={TITLE_ID} className="display text-title">
                  That did not finish
                </h2>
                <p className="max-w-sm text-[0.9375rem] leading-relaxed text-ink-3">
                  {message}
                </p>
                <Button onClick={again}>Try again</Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Sheet>
      ) : null}
    </AnimatePresence>
  );
}
