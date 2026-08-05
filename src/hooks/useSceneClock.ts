"use client";

import { useEffect, useMemo, useState } from "react";

export interface Beat {
  /** Semantic name, e.g. "capture" or "scan". */
  id: string;
  /** Seconds this beat holds. */
  duration: number;
}

export interface SceneClock<Id extends string = string> {
  index: number;
  id: Id;
  /** Increments on every loop — useful as a React key to restart children. */
  cycle: number;
  is: (id: Id) => boolean;
  /** True once the scene has reached `id` (inclusive). */
  past: (id: Id) => boolean;
  before: (id: Id) => boolean;
}

interface Options<Id extends string> {
  /** Scenes pause when scrolled out of view. */
  active?: boolean;
  loop?: boolean;
  /** Beat to hold when the viewer prefers reduced motion. Defaults to last. */
  restingId?: Id;
  reduced?: boolean;
}

/**
 * A declarative choreography clock.
 *
 * Scenes describe what each beat looks like; this decides when. Every animated
 * scene in Blink shares it, which is why the whole product feels like it runs
 * on one sense of timing.
 */
export function useSceneClock<const Beats extends readonly Beat[]>(
  beats: Beats,
  options: Options<Beats[number]["id"]> = {},
): SceneClock<Beats[number]["id"]> {
  type Id = Beats[number]["id"];

  const { active = true, loop = true, restingId, reduced = false } = options;

  const restingIndex = useMemo(() => {
    if (!restingId) return beats.length - 1;
    const found = beats.findIndex((beat) => beat.id === restingId);
    return found === -1 ? beats.length - 1 : found;
  }, [beats, restingId]);

  const [rawIndex, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  // Reduced motion is derived, not stored: the scene reports its resting beat
  // and no timers ever start.
  const index = reduced ? restingIndex : rawIndex;

  useEffect(() => {
    if (reduced || !active) return;

    const beat = beats[index];
    if (!beat) return;

    const timer = window.setTimeout(() => {
      const next = index + 1;
      if (next < beats.length) {
        setIndex(next);
      } else if (loop) {
        setCycle((value) => value + 1);
        setIndex(0);
      }
    }, beat.duration * 1000);

    return () => window.clearTimeout(timer);
  }, [index, active, loop, reduced, beats]);

  return useMemo(() => {
    const indexOf = (id: Id) => beats.findIndex((beat) => beat.id === id);
    const current = beats[index]?.id as Id;

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
  }, [index, cycle, beats]);
}
