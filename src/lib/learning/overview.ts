import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurriculum, getLearningState, type LessonSummary } from "@/lib/learning/queries";
import { getMissions, type MissionSummary } from "@/lib/workspace/queries";
import { getProgressSnapshot } from "@/lib/progress/queries";
import { buildRoadmap, type PhaseState } from "@/lib/lock/roadmap";
import { roadmapFromPhases } from "@/lib/progress/rules";
import type { ModuleRow, LearnerPhaseProgressRow } from "@/types/database";

/**
 * The curriculum tree, assembled once.
 *
 * Home, the roadmap, the lessons index and the module page were each stitching
 * phases, modules, lessons, missions and progress together in their own way, so
 * the same phase could be "current" on one screen and not on another. This
 * composes it in one place from the queries that already exist — it adds no
 * new source of truth and no new database round trip beyond the mission list
 * those pages already needed.
 *
 * Everything here is derived. Nothing is stored, and the progress figures come
 * from `learner_phase_progress`, which is the same view the progress pages read.
 */

export interface ModuleWithProgress {
  module: ModuleRow;
  lessons: LessonSummary[];
  lessonsDone: number;
  missions: MissionSummary[];
  minutes: number;
  /** The first unfinished lesson in this module, if any. */
  nextLesson: LessonSummary | null;
  /** 1-based position within its phase. What the interface calls "Module 02". */
  number: number;
  /** The phase this module belongs to. Lets a module stand on its own. */
  phaseKey: string;
  /**
   * What this module teaches, gathered from its lessons.
   *
   * Modules have no objectives column and should not get one: the claim
   * belongs to the lesson that makes it, and a second copy on the module is a
   * second thing to keep true. De-duplicated, in lesson order.
   */
  objectives: string[];
}

export interface PhaseNode {
  key: string;
  number: number;
  label: string;
  summary: string;
  state: PhaseState;
  modules: ModuleWithProgress[];
  missions: MissionSummary[];
  lessonCount: number;
  lessonsDone: number;
  missionsDone: number;
  minutes: number;
  /** Null when nothing is published in the phase. Never rendered as 0%. */
  percent: number | null;
  published: boolean;
}

export interface LearningOverview {
  phases: PhaseNode[];
  current: PhaseNode | null;
  /**
   * The phase to open, which is not always the "current" one.
   *
   * `current` follows the rule the roadmap has used since Prompt 2: a phase is
   * only current once something in it is done, because a product that decides
   * on your behalf that you are mid-way through Think lies in its first
   * sentence. That is right for a *state label* and wrong for a *layout*: on
   * day one it leaves every phase collapsed and the strip uniformly grey, so
   * the screen answers "where am I" with silence.
   *
   * So this is the phase the interface opens and marks — the one holding the
   * next piece of work — while `current` stays honest about what has actually
   * been started.
   */
  activeKey: string | null;
  /** The single lesson to do now, across the whole curriculum. */
  nextLesson: { lesson: LessonSummary; phase: PhaseNode } | null;
  /** The single mission to do now. */
  nextMission: MissionSummary | null;
  /** The module holding `nextLesson` — the one thing to open now. */
  nextModule: ModuleWithProgress | null;
  /**
   * Has this learner done anything at all?
   *
   * Decides whether the programme greets them with "Start here" or "Continue".
   * Derived from completed work rather than stored, so it cannot drift from
   * what the progress pages report.
   */
  started: boolean;
  moduleCount: number;
  totalMissions: number;
  missionsDone: number;
  continueLesson: LessonSummary | null;
  revisit: LessonSummary[];
  completedLessons: number;
  totalLessons: number;
  overallPercent: number | null;
}

export const getLearningOverview = cache(async (): Promise<LearningOverview> => {
  const [curriculum, state, missions, progress] = await Promise.all([
    getCurriculum(),
    getLearningState(),
    getMissions(),
    getProgressSnapshot(),
  ]);

  const phaseProgress = new Map<string, LearnerPhaseProgressRow>(
    progress.phases.map((row) => [row.phase_key, row]),
  );

  // `buildRoadmap` owns the four-state vocabulary; deriving it here would be a
  // second implementation of the rule the roadmap has used since Prompt 2.
  const roadmapState = new Map(
    buildRoadmap(roadmapFromPhases(progress.phases)).map((p) => [p.key as string, p.state]),
  );

  const missionsByPhase = new Map<string, MissionSummary[]>();
  for (const entry of missions) {
    const list = missionsByPhase.get(entry.mission.phase_key) ?? [];
    list.push(entry);
    missionsByPhase.set(entry.mission.phase_key, list);
  }

  const phases: PhaseNode[] = curriculum.map(({ phase, modules }) => {
    const phaseMissions = missionsByPhase.get(phase.key) ?? [];
    const row = phaseProgress.get(phase.key);

    const moduleNodes: ModuleWithProgress[] = modules.map((entry, index) => {
      const done = entry.lessons.filter((l) => state.completedLessonIds.has(l.id)).length;
      return {
        module: entry.module,
        number: index + 1,
        phaseKey: phase.key,
        objectives: [...new Set(entry.lessons.flatMap((l) => l.objectives))],
        lessons: entry.lessons,
        lessonsDone: done,
        // A mission belongs to a module when it names one; the rest sit at the
        // phase level, which is how the schema already models it.
        missions: phaseMissions.filter((m) => m.mission.module_id === entry.module.id),
        minutes: entry.lessons.reduce((total, l) => total + l.estimatedMinutes, 0),
        nextLesson: entry.lessons.find((l) => !state.completedLessonIds.has(l.id)) ?? null,
      };
    });

    const lessons = moduleNodes.flatMap((m) => m.lessons);

    return {
      key: phase.key,
      number: phase.position,
      label: phase.label,
      summary: phase.summary,
      state: roadmapState.get(phase.key) ?? "locked",
      modules: moduleNodes,
      missions: phaseMissions,
      lessonCount: lessons.length,
      lessonsDone: moduleNodes.reduce((total, m) => total + m.lessonsDone, 0),
      missionsDone: phaseMissions.filter((m) => m.progress?.status === "completed").length,
      minutes: moduleNodes.reduce((total, m) => total + m.minutes, 0),
      percent: row?.percent ?? null,
      published: lessons.length > 0 || phaseMissions.length > 0,
    };
  });

  const current = phases.find((p) => p.state === "current") ?? null;

  /*
   * What to do next, decided once for every surface.
   *
   * Earliest phase first, then the first unfinished lesson in it. "Earliest
   * rather than most recent" is the rule the roadmap has always used: the
   * programme is a sequence, and going back to an unfinished earlier phase is
   * the right answer to "what now".
   */
  let nextLesson: LearningOverview["nextLesson"] = null;
  for (const phase of phases) {
    const lesson = phase.modules.flatMap((m) => m.lessons)
      .find((l) => !state.completedLessonIds.has(l.id));
    if (lesson) { nextLesson = { lesson, phase }; break; }
  }

  const nextMission =
    missions.find((m) => m.progress?.status !== "completed") ?? null;

  const activeKey =
    current?.key ?? nextLesson?.phase.key ?? phases.find((p) => p.published)?.key ?? null;

  const byId = new Map(
    phases.flatMap((p) => p.modules.flatMap((m) => m.lessons)).map((l) => [l.id, l]),
  );

  const allModules = phases.flatMap((p) => p.modules);
  const nextModule = nextLesson
    ? (allModules.find((m) => m.lessons.some((l) => l.id === nextLesson.lesson.id)) ?? null)
    : null;

  const completedLessons = phases.reduce((t, p) => t + p.lessonsDone, 0);
  const missionsDone = missions.filter((m) => m.progress?.status === "completed").length;

  return {
    phases,
    current,
    activeKey,
    nextLesson,
    nextMission,
    nextModule,
    started: completedLessons > 0 || missions.some((m) => m.progress !== null),
    moduleCount: allModules.length,
    totalMissions: missions.length,
    missionsDone,
    continueLesson: state.continueLessonId ? (byId.get(state.continueLessonId) ?? null) : null,
    revisit: [...state.revisitLessonIds].map((id) => byId.get(id)).filter((l): l is LessonSummary => !!l),
    completedLessons,
    totalLessons: phases.reduce((t, p) => t + p.lessonCount, 0),
    overallPercent: progress.overall?.percent ?? null,
  };
});

/**
 * Where a lesson sits, and what comes either side of it.
 *
 * This is what stops a lesson being a dead end. Before it, finishing a lesson
 * left the learner on a page with no forward motion, so the only way to the
 * next one was back out to an index — which is exactly the trip the
 * consolidation exists to remove. Everything here is derived from the tree that
 * is already loaded; it costs no extra query.
 */
export const getLessonContext = cache(async (lessonId: string) => {
  const overview = await getLearningOverview();

  for (const phase of overview.phases) {
    for (const entry of phase.modules) {
      const index = entry.lessons.findIndex((lesson) => lesson.id === lessonId);
      if (index === -1) continue;

      const nextModule = phase.modules[entry.number] ?? null;
      /* The mission is the module's conclusion, so it only counts as "next"
         from the last lesson — offering it from lesson one would skip the
         teaching it applies. */
      const onLastLesson = index === entry.lessons.length - 1;

      return {
        phase,
        module: entry,
        index,
        total: entry.lessons.length,
        previous: index > 0 ? (entry.lessons[index - 1] ?? null) : null,
        next: entry.lessons[index + 1] ?? null,
        mission: onLastLesson ? (entry.missions[0] ?? null) : null,
        nextModule,
      };
    }
  }

  return null;
});

/**
 * Where a mission sits in the curriculum.
 *
 * A mission is the end of a module, and the mission page had no way of saying
 * so — its only route out was "All missions", which sent the learner to a
 * library instead of back to the work. This gives it the module it concludes
 * and the module that follows.
 */
export const getMissionContext = cache(async (missionId: string) => {
  const overview = await getLearningOverview();

  for (const phase of overview.phases) {
    for (const entry of phase.modules) {
      if (!entry.missions.some((m) => m.mission.id === missionId)) continue;
      return { phase, module: entry, nextModule: phase.modules[entry.number] ?? null };
    }
    /* Missions that name no module still belong to a phase — the schema allows
       it, so the page must not assume otherwise. */
    if (phase.missions.some((m) => m.mission.id === missionId)) {
      return { phase, module: null, nextModule: phase.modules[0] ?? null };
    }
  }

  return null;
});

/** One module, for its own page. Reuses the tree rather than re-querying. */
export const getModuleBySlug = cache(async (slug: string) => {
  const overview = await getLearningOverview();
  for (const phase of overview.phases) {
    const found = phase.modules.find((m) => m.module.slug === slug);
    if (found) return { phase, module: found };
  }

  /*
   * Not in the published tree. It may still exist and be a draft, which staff
   * can read — so this asks rather than assuming, and a learner gets the same
   * empty answer either way because the policy decides, not this function.
   */
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("*").eq("slug", slug).maybeSingle();
  return data ? { phase: null, module: null } : null;
});
