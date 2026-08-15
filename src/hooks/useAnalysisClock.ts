"use client";

import { useEffect, useRef, useState } from "react";
import { stageAt } from "@/lib/analysis/pipeline";
import { clamp } from "@/lib/utils";

/**
 * Pacing a wait whose length nobody knows.
 *
 * A real analysis is two model passes and takes as long as it takes. The deck
 * has to move through nine stages during it without ever lying: it must not
 * finish early and sit there, and it must not claim to be done before the
 * report exists.
 *
 * So the clock has two halves. Before the result lands it walks the estimate and
 * then decelerates towards a ceiling it never reaches — a slow run visibly slows
 * down instead of stopping. Once the result lands it closes the remaining
 * distance smoothly, holds on the last card long enough to be read, and only
 * then says it is finished.
 */

/** The most the clock will claim before the result actually exists. */
const CEILING = 0.955;
/** Fraction of the estimate spent on the first, linear stretch. */
const PACED = 0.9;
/** Closing the gap once the result is in hand. */
const CLOSE_MS = 1250;
/** How long the last card stays before the report takes over. */
const HOLD_MS = 700;

export interface AnalysisClock {
  progress: number;
  stage: number;
  /** True once the estimate is spent and the result has not arrived. */
  overtime: boolean;
  complete: boolean;
}

export function useAnalysisClock({
  startedAt,
  expectedMs,
  /** When the result becomes usable. Null while the run is still in flight. */
  resultAt,
  onComplete,
  reduced = false,
}: {
  startedAt: number | null;
  expectedMs: number;
  resultAt: number | null;
  onComplete: () => void;
  reduced?: boolean;
}): AnalysisClock {
  const [clock, setClock] = useState<AnalysisClock>({
    progress: 0,
    stage: 0,
    overtime: false,
    complete: false,
  });

  const closing = useRef<{ from: number; at: number } | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (startedAt === null) return;

    /* A new run starts from nothing. Reset here rather than in an effect of its
       own: the first frame writes the true value a few milliseconds later, so
       an extra render pass to zero it would be a render nobody sees. */
    closing.current = null;
    fired.current = false;

    /* Reduced motion gets the whole thing without the theatre: as soon as there
       is a report, show it. */
    if (reduced) {
      if (resultAt === null) return;
      const wait = Math.max(0, resultAt - Date.now());
      const timer = setTimeout(() => {
        setClock({ progress: 1, stage: 8, overtime: false, complete: true });
        if (!fired.current) {
          fired.current = true;
          onComplete();
        }
      }, wait);
      return () => clearTimeout(timer);
    }

    let frame = 0;

    const tick = () => {
      const now = Date.now();
      const raw = (now - startedAt) / expectedMs;
      const ready = resultAt !== null && now >= resultAt;

      let progress: number;

      if (ready) {
        closing.current ??= {
          from: clamp(paced(raw), 0, CEILING),
          at: now,
        };
        const travelled = clamp((now - closing.current.at) / CLOSE_MS, 0, 1);
        progress =
          closing.current.from + (1 - closing.current.from) * easeOut(travelled);
      } else {
        progress = clamp(paced(raw), 0, CEILING);
      }

      const complete = progress >= 0.9999;
      setClock({
        progress,
        stage: stageAt(progress),
        overtime: !ready && raw > 1,
        complete,
      });

      if (complete && closing.current) {
        if (!fired.current) {
          fired.current = true;
          setTimeout(onComplete, HOLD_MS);
        }
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt, expectedMs, resultAt, onComplete, reduced]);

  return clock;
}

/** Linear through the estimate, then asymptotic. Never reaches the ceiling. */
function paced(raw: number): number {
  if (raw <= 1) return PACED * Math.max(0, raw);
  return PACED + (CEILING - PACED) * (1 - Math.exp(-(raw - 1) * 0.55));
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
