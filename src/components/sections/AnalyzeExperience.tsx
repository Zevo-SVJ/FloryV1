"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnalyzingSequence } from "@/components/analyze/AnalyzingSequence";
import { Dropzone, type SelectedFile } from "@/components/analyze/Dropzone";
import { Report } from "@/components/report/Report";
import { Button } from "@/components/ui/Button";
import { Eyebrow, Section } from "@/components/ui/Section";
import { analyzeProfile, analyzeSample } from "@/lib/analysis";
import { EASE_OUT } from "@/lib/motion";
import type { PerceptionReport } from "@/types/report";

/**
 * Sections four, five and six — the product itself.
 *
 * One place owns the whole flow: choose a screenshot, watch it be read,
 * receive the report. The three states replace each other in the same
 * position on the page, so it reads as one continuous act.
 */

type Status = "idle" | "analyzing" | "done" | "error";

interface State {
  status: Status;
  previewUrl: string | null;
  report: PerceptionReport | null;
  message: string | null;
}

const INITIAL: State = {
  status: "idle",
  previewUrl: null,
  report: null,
  message: null,
};

const HEADINGS: Record<Status, { eyebrow: string; title: string }> = {
  idle: {
    eyebrow: "The demo",
    title: "See it on your own profile.",
  },
  analyzing: {
    eyebrow: "Reading",
    title: "Forming a first impression.",
  },
  done: {
    eyebrow: "Your report",
    title: "This is what a stranger sees.",
  },
  error: {
    eyebrow: "Interrupted",
    title: "That did not go through.",
  },
};

export function AnalyzeExperience() {
  const [state, setState] = useState<State>(INITIAL);
  const anchorRef = useRef<HTMLDivElement>(null);

  const focusSection = useCallback(() => {
    anchorRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const run = useCallback(
    async (input: {
      fileName: string;
      fileSize: number;
      previewUrl: string | null;
      sample?: boolean;
    }) => {
      setState({
        status: "analyzing",
        previewUrl: input.previewUrl,
        report: null,
        message: null,
      });

      // Give the browser a frame to paint the loading state before scrolling.
      requestAnimationFrame(focusSection);

      try {
        const report = input.sample
          ? await analyzeSample()
          : await analyzeProfile({
              fileName: input.fileName,
              fileSize: input.fileSize,
              previewUrl: input.previewUrl ?? "",
            });

        setState({
          status: "done",
          previewUrl: input.previewUrl,
          report,
          message: null,
        });
        requestAnimationFrame(focusSection);
      } catch {
        setState({
          status: "error",
          previewUrl: input.previewUrl,
          report: null,
          message: "The analysis could not be completed. Try that screenshot again.",
        });
      }
    },
    [focusSection],
  );

  const handleAnalyze = useCallback(
    (selection: SelectedFile) => {
      void run({
        fileName: selection.file.name,
        fileSize: selection.file.size,
        previewUrl: selection.previewUrl,
      });
    },
    [run],
  );

  const handleSample = useCallback(() => {
    void run({
      fileName: "sample-profile.png",
      fileSize: 482_119,
      previewUrl: null,
      sample: true,
    });
  }, [run]);

  const reset = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    setState(INITIAL);
    requestAnimationFrame(focusSection);
  }, [focusSection, state.previewUrl]);

  const heading = HEADINGS[state.status];

  return (
    <Section id="analyze" divider>
      <div ref={anchorRef} className="absolute top-0 scroll-mt-24" aria-hidden />

      <div className="edge">
        {/* The heading changes with the state — the page narrates itself. */}
        <div className="min-h-[8.5rem] max-w-2xl sm:min-h-[10rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.status}
              initial={{ opacity: 0, y: 14, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(5px)" }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
            >
              <Eyebrow accent>{heading.eyebrow}</Eyebrow>
              <h2 className="mt-6 text-display font-medium">{heading.title}</h2>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-14 lg:mt-20">
          <AnimatePresence mode="wait">
            {state.status === "idle" ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
                <Dropzone onAnalyze={handleAnalyze} onUseSample={handleSample} />
              </motion.div>
            ) : null}

            {state.status === "analyzing" ? (
              <motion.div key="analyzing" className="py-8 sm:py-14">
                <AnalyzingSequence previewUrl={state.previewUrl} />
              </motion.div>
            ) : null}

            {state.status === "done" && state.report ? (
              <Report
                key="done"
                report={state.report}
                previewUrl={state.previewUrl}
                onReset={reset}
              />
            ) : null}

            {state.status === "error" ? (
              <motion.div
                key="error"
                className="flex flex-col items-start gap-6 rounded-panel border border-line bg-surface p-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              >
                <p className="max-w-md text-lede text-ink-muted">{state.message}</p>
                <Button variant="outline" onClick={reset}>
                  Start over
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
