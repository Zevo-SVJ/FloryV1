import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/dal";
import { parseBlocks, type Block } from "@/lib/learning/blocks";
import type {
  LearnerBlockResponseRow,
  LearnerLessonProgressRow,
  LessonResourceRow,
  LessonRow,
  ModuleRow,
  PhaseRow,
} from "@/types/database";

/**
 * Reads for the learning system.
 *
 * Every one of these runs as the signed-in learner, so Row Level Security
 * decides what comes back — there is no filtering by `profile_id` in these
 * queries because the policies already do it, and a query that filtered by a
 * value from the request would be the bug those policies exist to prevent.
 *
 * `cache()` memoizes for one render pass: a lesson page's header, its body and
 * its sidebar all ask for the same lesson and cost one round trip.
 */

export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: LessonRow["type"];
  difficulty: LessonRow["difficulty"];
  estimatedMinutes: number;
  completionRule: LessonRow["completion_rule"];
  position: number;
  isDemo: boolean;
  /** What the lesson claims you will be able to do. Used to build a module's
      "what you will learn" without inventing copy for it. */
  objectives: string[];
}

export interface ModuleWithLessons {
  module: ModuleRow;
  lessons: LessonSummary[];
}

export interface PhaseWithModules {
  phase: PhaseRow;
  modules: ModuleWithLessons[];
}

const toSummary = (row: LessonRow): LessonSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  type: row.type,
  difficulty: row.difficulty,
  estimatedMinutes: row.estimated_minutes,
  completionRule: row.completion_rule,
  position: row.position,
  isDemo: row.is_demo,
  objectives: row.objectives,
});

/**
 * The whole curriculum tree, in three queries rather than one per module.
 *
 * A nested `select` through PostgREST would do it in one, and it is avoided
 * deliberately: the embedded-resource syntax is the part of this stack that is
 * hardest to read back in six months, and three flat queries against three
 * small tables cost less than the ambiguity. Revisit when the curriculum is
 * large enough for it to matter.
 */
export const getCurriculum = cache(async (): Promise<PhaseWithModules[]> => {
  const supabase = await createClient();

  const [phases, modules, lessons] = await Promise.all([
    supabase.from("phases").select("*").order("position"),
    supabase.from("modules").select("*").order("position"),
    supabase.from("lessons").select("*").order("position"),
  ]);

  if (phases.error || modules.error || lessons.error) return [];

  const lessonsByModule = new Map<string, LessonSummary[]>();
  for (const lesson of lessons.data ?? []) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push(toSummary(lesson));
    lessonsByModule.set(lesson.module_id, list);
  }

  return (phases.data ?? []).map((phase) => ({
    phase,
    modules: (modules.data ?? [])
      .filter((module) => module.phase_key === phase.key)
      .map((module) => ({
        module,
        lessons: lessonsByModule.get(module.id) ?? [],
      })),
  }));
});

export interface LessonDetail {
  lesson: LessonRow;
  blocks: Block[];
  /** Blocks the schema rejected. Surfaced rather than swallowed. */
  rejectedBlocks: number;
  module: ModuleRow | null;
  phase: PhaseRow | null;
  resources: LessonResourceRow[];
  /** Prerequisites, with whether this learner has cleared each. */
  prerequisites: { lesson: LessonSummary; met: boolean }[];
  /** True when every prerequisite is complete. */
  unlocked: boolean;
  progress: LearnerLessonProgressRow | null;
  responses: Map<string, LearnerBlockResponseRow>;
  note: string | null;
}

export const getLesson = cache(async (slug: string): Promise<LessonDetail | null> => {
  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !lesson) return null;

  const [moduleResult, resourceResult, prereqResult, progressResult, responseResult, noteResult] =
    await Promise.all([
      supabase.from("modules").select("*").eq("id", lesson.module_id).maybeSingle(),
      supabase.from("lesson_resources").select("*").eq("lesson_id", lesson.id).order("position"),
      supabase.from("lesson_prerequisites").select("*").eq("lesson_id", lesson.id),
      supabase.from("learner_lesson_progress").select("*").eq("lesson_id", lesson.id).maybeSingle(),
      supabase.from("learner_block_responses").select("*").eq("lesson_id", lesson.id),
      supabase.from("learner_lesson_notes").select("body").eq("lesson_id", lesson.id).maybeSingle(),
    ]);

  /* Named `lessonModule`, not `module`: assigning to a bare `module` collides
     with the CommonJS binding Next's bundler injects, and its lint rule catches
     it. The property on `LessonDetail` keeps the readable name. */
  const lessonModule = moduleResult.data ?? null;

  const phaseResult = lessonModule
    ? await supabase.from("phases").select("*").eq("key", lessonModule.phase_key).maybeSingle()
    : null;

  const prerequisites = await resolvePrerequisites(
    (prereqResult.data ?? []).map((row) => row.requires_lesson_id),
  );

  const { blocks, rejected } = parseBlocks(lesson.blocks);

  return {
    lesson,
    blocks,
    rejectedBlocks: rejected,
    module: lessonModule,
    phase: phaseResult?.data ?? null,
    resources: resourceResult.data ?? [],
    prerequisites,
    unlocked: prerequisites.every((entry) => entry.met),
    progress: progressResult.data ?? null,
    responses: new Map((responseResult.data ?? []).map((row) => [row.block_id, row])),
    note: noteResult.data?.body ?? null,
  };
});

/** The prerequisite lessons, and whether this learner has finished each. */
async function resolvePrerequisites(
  ids: string[],
): Promise<{ lesson: LessonSummary; met: boolean }[]> {
  if (ids.length === 0) return [];

  const supabase = await createClient();
  const [lessons, progress] = await Promise.all([
    supabase.from("lessons").select("*").in("id", ids),
    supabase.from("learner_lesson_progress").select("*").in("lesson_id", ids),
  ]);

  const completed = new Set(
    (progress.data ?? []).filter((row) => row.status === "completed").map((row) => row.lesson_id),
  );

  return (lessons.data ?? []).map((lesson) => ({
    lesson: toSummary(lesson),
    met: completed.has(lesson.id),
  }));
}

export interface LearningState {
  /** Everything this learner has touched, newest first. */
  progress: LearnerLessonProgressRow[];
  completedLessonIds: Set<string>;
  /** Marked "I need to revisit this". */
  revisitLessonIds: Set<string>;
  /** The lesson to continue: most recently touched and not finished. */
  continueLessonId: string | null;
}

/**
 * The learner's state across the whole curriculum.
 *
 * Deliberately data rather than intelligence. "What should I learn next?" is a
 * question a later prompt answers; this returns the facts that question will be
 * asked of — what is done, what was flagged for review, what was open last.
 */
export const getLearningState = cache(async (): Promise<LearningState> => {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("learner_lesson_progress")
    .select("*")
    .order("updated_at", { ascending: false });

  const progress = data ?? [];

  return {
    progress,
    completedLessonIds: new Set(
      progress.filter((row) => row.status === "completed").map((row) => row.lesson_id),
    ),
    revisitLessonIds: new Set(
      progress.filter((row) => row.confidence === "revisit").map((row) => row.lesson_id),
    ),
    continueLessonId:
      progress.find((row) => row.status === "in_progress")?.lesson_id ?? null,
  };
});
