"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { analyzeProfile, analyzeSample } from "@/lib/analysis/engine";
import type { PerceptionReport } from "@/types/report";

/**
 * The analyze flow is the product; the page is its front door.
 *
 * Every "Analyze my profile" button in the product calls `open()` — nothing
 * scrolls anywhere. This holds the flow's state machine so the overlay can be
 * mounted once at the root and driven from anywhere.
 */

type Phase = "closed" | "upload" | "running" | "report" | "error";

interface State {
  phase: Phase;
  fileName: string | null;
  previewUrl: string | null;
  report: PerceptionReport | null;
  message: string | null;
}

const INITIAL: State = {
  phase: "closed",
  fileName: null,
  previewUrl: null,
  report: null,
  message: null,
};

interface AnalyzeApi extends State {
  open: () => void;
  close: () => void;
  submit: (file: File) => void;
  runSample: () => void;
  /** Back to the upload step, keeping the overlay open. */
  again: () => void;
}

const AnalyzeContext = createContext<AnalyzeApi | null>(null);

export function AnalyzeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(INITIAL);
  const previewRef = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }, []);

  const open = useCallback(() => {
    setState((current) =>
      current.phase === "closed" ? { ...current, phase: "upload" } : current,
    );
  }, []);

  const close = useCallback(() => {
    releasePreview();
    setState(INITIAL);
  }, [releasePreview]);

  const again = useCallback(() => {
    releasePreview();
    setState({ ...INITIAL, phase: "upload" });
  }, [releasePreview]);

  const run = useCallback(
    async (
      input: { fileName: string; fileSize: number; previewUrl: string | null },
      sample: boolean,
    ) => {
      setState({
        phase: "running",
        fileName: input.fileName,
        previewUrl: input.previewUrl,
        report: null,
        message: null,
      });

      try {
        const report = sample
          ? await analyzeSample()
          : await analyzeProfile({
              fileName: input.fileName,
              fileSize: input.fileSize,
              previewUrl: input.previewUrl ?? "",
            });

        setState((current) =>
          current.phase === "running"
            ? { ...current, phase: "report", report }
            : current,
        );
      } catch {
        setState((current) => ({
          ...current,
          phase: "error",
          message: "The analysis stopped before it finished. Try that screenshot again.",
        }));
      }
    },
    [],
  );

  const submit = useCallback(
    (file: File) => {
      releasePreview();
      const previewUrl = URL.createObjectURL(file);
      previewRef.current = previewUrl;
      void run({ fileName: file.name, fileSize: file.size, previewUrl }, false);
    },
    [releasePreview, run],
  );

  const runSample = useCallback(() => {
    releasePreview();
    void run(
      { fileName: "blink-sample-profile.png", fileSize: 482_119, previewUrl: null },
      true,
    );
  }, [releasePreview, run]);

  // The page behind the flow must not scroll, and Escape must always work.
  useEffect(() => {
    const isOpen = state.phase !== "closed";
    document.documentElement.dataset.locked = isOpen ? "true" : "false";

    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, close]);

  useEffect(() => releasePreview, [releasePreview]);

  const api = useMemo<AnalyzeApi>(
    () => ({ ...state, open, close, submit, runSample, again }),
    [state, open, close, submit, runSample, again],
  );

  return <AnalyzeContext.Provider value={api}>{children}</AnalyzeContext.Provider>;
}

export function useAnalyze(): AnalyzeApi {
  const context = useContext(AnalyzeContext);
  if (!context) throw new Error("useAnalyze must be used inside AnalyzeProvider");
  return context;
}
