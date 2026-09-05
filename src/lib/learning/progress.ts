import type { PhaseWithModules } from "@/lib/learning/queries";
import type { PhaseKey } from "@/lib/lock/phases";
import type { RoadmapProgress } from "@/lib/lock/roadmap";

/**
 * Turn what a learner has done into where they are on the roadmap.
 *
 * The rule that matters is the one about empty phases: **a phase with no
 * published lessons is never complete**. Without it, every phase of a
 * curriculum that has not been written yet would render as finished on day
 * one — the roadmap would congratulate somebody for material that does not
 * exist, which is the single most misleading thing this screen could do.
 *
 * A phase is complete when it has lessons and all of them are done. The current
 * phase is the earliest one with lessons that is not complete — earliest, not
 * "most recently opened", because the program is a sequence and going back to
 * an unfinished earlier phase is the correct answer to "where am I".
 */
export function deriveRoadmapProgress(
  curriculum: PhaseWithModules[],
  completedLessonIds: Set<string>,
): RoadmapProgress {
  const completed: PhaseKey[] = [];
  let current: PhaseKey | null = null;

  for (const { phase, modules } of curriculum) {
    const lessons = modules.flatMap((module) => module.lessons);
    const key = phase.key as PhaseKey;

    if (lessons.length === 0) continue;

    if (lessons.every((lesson) => completedLessonIds.has(lesson.id))) {
      completed.push(key);
    } else if (current === null) {
      /*
       * Only counted as "in progress" once something in it is done. A phase
       * nobody has touched is ahead of you, not under your feet, and the
       * roadmap's `upcoming` state says that more honestly.
       */
      if (lessons.some((lesson) => completedLessonIds.has(lesson.id))) {
        current = key;
      }
    }
  }

  return { completed, current };
}

/** Minutes left in the phases that are not finished. Null when nothing is published. */
export function remainingMinutes(
  curriculum: PhaseWithModules[],
  completedLessonIds: Set<string>,
): number | null {
  const lessons = curriculum.flatMap(({ modules }) =>
    modules.flatMap((module) => module.lessons),
  );
  if (lessons.length === 0) return null;

  return lessons
    .filter((lesson) => !completedLessonIds.has(lesson.id))
    .reduce((total, lesson) => total + lesson.estimatedMinutes, 0);
}
