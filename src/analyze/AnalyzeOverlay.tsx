"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAnalyze } from "@/analyze/AnalyzeContext";
import { HistoryPanel } from "@/analyze/HistoryPanel";
import { ReportPanel } from "@/analyze/ReportPanel";
import { Sheet } from "@/analyze/Sheet";
import { StagePanel } from "@/analyze/StagePanel";
import { UploadPanel } from "@/analyze/UploadPanel";
import { SignInPanel } from "@/auth/SignInPanel";
import { Button } from "@/components/ui/Button";
import { EASE_OUT } from "@/lib/motion";

const TITLE_ID = "analyze-flow-title";

/**
 * The flow, mounted once at the root.
 *
 * Upload, read, report, history and sign-in are all states of one surface
 * rather than five pages. The sheet stays put and its contents cross over
 * inside it, which is why the product reads as an app instead of a set of
 * screens with a back button.
 */
export function AnalyzeOverlay() {
  const { phase, previewUrl, report, message, close, again } = useAnalyze();
  const isOpen = phase !== "closed";
  const wide = phase === "running" || phase === "report" || phase === "history";

  return (
    <AnimatePresence>
      {isOpen ? (
        <Sheet
          key="sheet"
          onClose={close}
          labelledBy={TITLE_ID}
          wide={wide}
          fill={phase === "report" || phase === "running"}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase}
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
            >
              {phase === "upload" ? <UploadPanel titleId={TITLE_ID} /> : null}
              {phase === "running" ? <StagePanel titleId={TITLE_ID} /> : null}
              {phase === "history" ? <HistoryPanel titleId={TITLE_ID} /> : null}
              {phase === "signin" ? <SignInPanel titleId={TITLE_ID} /> : null}

              {phase === "report" && report ? (
                <ReportPanel
                  report={report}
                  previewUrl={previewUrl}
                  titleId={TITLE_ID}
                />
              ) : null}

              {phase === "error" ? (
                <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-5 px-6 py-16 sm:px-10">
                  <h2 id={TITLE_ID} className="display text-title">
                    That did not finish
                  </h2>
                  <p className="max-w-sm text-[0.9375rem] leading-relaxed text-ink-3">
                    {message}
                  </p>
                  <Button onClick={again}>Try again</Button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </Sheet>
      ) : null}
    </AnimatePresence>
  );
}
