"use client";

import { useEffect, useMemo, useState } from "react";

export interface CinematicStep {
  /** Semantic name for the beat, e.g. "capture" or "scan". */
  id: string;
  /** Seconds this beat holds before the next one begins. */
  duration: number;
}

export interface CinematicClock<Id extends string = string> {
  /** Index of the current beat. */
  index: number;
  /** Id of the current beat. */
  id: Id;
  /** Increments every time the sequence loops — useful as a React key. */
  cycle: number;
  /** True when the current beat is exactly `id`. */
  is: (id: Id) => boolean;
  /** True once the sequence has reached `id` (inclusive). */
  past: (id: Id) => boolean;
  /** True while the sequence is before `id`. */
  before: (id: Id) => boolean;
}

interface Options<Id extends string> {
  /** Pause the clock when the stage is off-screen. */
  active?: boolean;
  loop?: boolean;
  /** Beat to hold when the viewer prefers reduced motion. Defaults to the last. */
  restingId?: Id;
  reduced?: boolean;
}

/**
 * A tiny, declarative choreography clock.
 *
 * Cinematics describe *what* each beat looks like; this decides *when*.
 * Every scene in Blink is driven by one of these, which is why the whole
 * page feels like it shares a single sense of timing.
 */
export function useCinematicClock<const Steps extends readonly CinematicStep[]>(
  steps: Steps,
  options: Options<Steps[number]["id"]> = {},
): CinematicClock<Steps[number]["id"]> {
  type Id = Steps[number]["id"];

  const { active = true, loop = true, restingId, reduced = false } = options;

  const restingIndex = useMemo(() => {
    if (!restingId) return steps.length - 1;
    const found = steps.findIndex((step) => step.id === restingId);
    return found === -1 ? steps.length - 1 : found;
  }, [steps, restingId]);

  const [rawIndex, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  // Reduced motion is derived, not stored: the sequence simply reports its
  // resting beat and no timers are ever started.
  const index = reduced ? restingIndex : rawIndex;

  useEffect(() => {
    if (reduced || !active) return;

    const step = steps[index];
    if (!step) return;

    const timer = window.setTimeout(() => {
      const next = index + 1;
      if (next < steps.length) {
        setIndex(next);
      } else if (loop) {
        setCycle((value) => value + 1);
        setIndex(0);
      }
    }, step.duration * 1000);

    return () => window.clearTimeout(timer);
  }, [index, active, loop, reduced, steps]);

  return useMemo(() => {
    const indexOf = (id: Id) => steps.findIndex((step) => step.id === id);
    const current = steps[index]?.id as Id;

    return {
      index,
      id: current,
      cycle,
      is: (id: Id) => current === id,
      past: (id: Id) => {
        const target = indexOf(id);
        return target !== -1 && index >= target;
      },
      before: (id: Id) => {
        const target = indexOf(id);
        return target !== -1 && index < target;
      },
    };
  }, [index, cycle, steps]);
}
