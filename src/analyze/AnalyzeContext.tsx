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
import { useAuth } from "@/auth/AuthContext";
import { AnalysisFailure, analyzeProfile, sampleReport } from "@/lib/analysis/engine";
import { prepareImage, ImageError } from "@/lib/analysis/image";
import { ESTIMATED_MS, SAMPLE_MS } from "@/lib/analysis/pipeline";
import { accountStore, deviceStore } from "@/lib/data/analyses";
import { useCapabilities } from "@/app/CapabilityContext";
import type { ErrorCode } from "@/lib/server/errors";
import type { PerceptionReport } from "@/types/report";

/**
 * The flow is the product; the page is its front door.
 *
 * Every "Analyze my profile" in the product calls `open()`. Nothing scrolls
 * anywhere, nothing navigates. This holds the state machine so the overlay can
 * be mounted once at the root and driven from anywhere — including from the
 * history list, which reopens a finished report through the same surface.
 */

export type Phase =
  | "closed"
  | "upload"
  | "running"
  | "report"
  | "error"
  | "history"
  | "signin";

interface State {
  phase: Phase;
  fileName: string | null;
  /** Object URL for the screenshot. Stays alive for the whole run and report. */
  previewUrl: string | null;
  report: PerceptionReport | null;
  message: string | null;
  errorCode: ErrorCode | null;
  /** How long this run is expected to take, so the deck can pace itself. */
  expectedMs: number;
  /** Set once the response lands, so the deck can finish rather than stall. */
  finishedAt: number | null;
  startedAt: number | null;
}

const INITIAL: State = {
  phase: "closed",
  fileName: null,
  previewUrl: null,
  report: null,
  message: null,
  errorCode: null,
  expectedMs: ESTIMATED_MS,
  finishedAt: null,
  startedAt: null,
};

interface AnalyzeApi extends State {
  open: () => void;
  openHistory: () => void;
  openSignIn: () => void;
  close: () => void;
  submit: (file: File) => void;
  runSample: () => void;
  /** Back to the upload step, keeping the overlay open. */
  again: () => void;
  /** Reopen a stored report in the same surface it was first read in. */
  reopen: (report: PerceptionReport) => void;
  /** Stop a run in flight. */
  cancel: () => void;
  /**
   * Called by the stage deck when it has shown its last card.
   *
   * The deck finishing is what promotes a completed run to the report — not the
   * network. That way a fast answer still gets its build-up and a slow one never
   * gets a false finish.
   */
  reveal: () => void;
}

const AnalyzeContext = createContext<AnalyzeApi | null>(null);

export function AnalyzeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(INITIAL);
  const previewRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { user, idToken } = useAuth();
  const { analysis } = useCapabilities();

  const releasePreview = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const open = useCallback(() => {
    setState((current) =>
      current.phase === "closed" ? { ...current, phase: "upload" } : current,
    );
  }, []);

  const openHistory = useCallback(() => {
    setState((current) => ({ ...current, phase: "history" }));
  }, []);

  const openSignIn = useCallback(() => {
    setState((current) => ({ ...current, phase: "signin" }));
  }, []);

  const close = useCallback(() => {
    stop();
    releasePreview();
    setState(INITIAL);
  }, [releasePreview, stop]);

  const again = useCallback(() => {
    stop();
    releasePreview();
    setState({ ...INITIAL, phase: "upload" });
  }, [releasePreview, stop]);

  const cancel = useCallback(() => {
    stop();
    setState((current) =>
      current.phase === "running" ? { ...current, phase: "upload" } : current,
    );
  }, [stop]);

  /** Keep the report, wherever it can be kept. Never block the reveal on it. */
  const remember = useCallback(
    (report: PerceptionReport) => {
      if (report.source === "sample") return;
      const store = user ? accountStore(user.uid) : deviceStore;
      void store.save(report).catch(() => {});
    },
    [user],
  );

  const fail = useCallback((code: ErrorCode, message: string) => {
    setState((current) => ({
      ...current,
      phase: "error",
      errorCode: code,
      message,
    }));
  }, []);

  const submit = useCallback(
    (file: File) => {
      releasePreview();
      stop();

      const previewUrl = URL.createObjectURL(file);
      previewRef.current = previewUrl;

      setState({
        ...INITIAL,
        phase: "running",
        fileName: file.name,
        previewUrl,
        expectedMs: ESTIMATED_MS,
        startedAt: Date.now(),
      });

      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          if (analysis !== "model") {
            throw new AnalysisFailure(
              "not_configured",
              "This build of Blink has no analysis model connected, so it cannot read your screenshot yet. The sample report shows exactly what you would get.",
            );
          }

          const prepared = await prepareImage(file);
          const token = await idToken();

          const report = await analyzeProfile({
            imageDataUrl: prepared.dataUrl,
            fileName: file.name,
            fileSize: file.size,
            idToken: token,
            signal: controller.signal,
          });

          remember(report);

          setState((current) =>
            current.phase === "running"
              ? { ...current, report, finishedAt: Date.now() }
              : current,
          );
        } catch (error) {
          if ((error as Error)?.name === "AbortError") return;
          if (error instanceof ImageError) {
            fail("unsupported_image", error.message);
          } else if (error instanceof AnalysisFailure) {
            fail(error.code, error.message);
          } else {
            fail("internal", "The analysis stopped before it finished. Try that screenshot again.");
          }
        }
      })();
    },
    [analysis, fail, idToken, releasePreview, remember, stop],
  );

  const runSample = useCallback(() => {
    releasePreview();
    stop();

    setState({
      ...INITIAL,
      phase: "running",
      fileName: null,
      previewUrl: null,
      expectedMs: SAMPLE_MS,
      startedAt: Date.now(),
    });

    const report = sampleReport();
    // Resolved immediately; the deck still plays, paced by `expectedMs`.
    setState((current) =>
      current.phase === "running"
        ? { ...current, report, finishedAt: Date.now() + SAMPLE_MS }
        : current,
    );
  }, [releasePreview, stop]);

  const reopen = useCallback(
    (report: PerceptionReport) => {
      releasePreview();
      stop();
      setState({ ...INITIAL, phase: "report", report });
    },
    [releasePreview, stop],
  );

  const reveal = useCallback(() => {
    setState((current) =>
      current.phase === "running" && current.report
        ? { ...current, phase: "report" }
        : current,
    );
  }, []);

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

  useEffect(() => () => releasePreview(), [releasePreview]);

  const api = useMemo<AnalyzeApi>(
    () => ({
      ...state,
      open,
      openHistory,
      openSignIn,
      close,
      submit,
      runSample,
      again,
      reopen,
      cancel,
      reveal,
    }),
    [
      state,
      open,
      openHistory,
      openSignIn,
      close,
      submit,
      runSample,
      again,
      reopen,
      cancel,
      reveal,
    ],
  );

  return <AnalyzeContext.Provider value={api}>{children}</AnalyzeContext.Provider>;
}

export function useAnalyze(): AnalyzeApi {
  const context = useContext(AnalyzeContext);
  if (!context) throw new Error("useAnalyze must be used inside AnalyzeProvider");
  return context;
}
