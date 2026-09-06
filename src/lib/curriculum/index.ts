import type { Curriculum, LessonSpec, MissionSpec, ModuleSpec } from "@/lib/curriculum/types";
import { think } from "@/lib/curriculum/phases/think";
import { research } from "@/lib/curriculum/phases/research";
import { validate } from "@/lib/curriculum/phases/validate";
import { product } from "@/lib/curriculum/phases/product";
import { design } from "@/lib/curriculum/phases/design";
import { build } from "@/lib/curriculum/phases/build";
import { test } from "@/lib/curriculum/phases/test";
import { ship } from "@/lib/curriculum/phases/ship";
import { monetize } from "@/lib/curriculum/phases/monetize";
import { grow } from "@/lib/curriculum/phases/grow";

/**
 * The programme, in order.
 *
 * Ten phases, one continuous journey: an idea becomes a problem, a problem
 * becomes evidence, evidence becomes scope, scope becomes software, software
 * becomes a product somebody pays for. Each phase's missions produce an
 * artifact that the next phase consumes, which is what makes it a journey
 * rather than ten courses that happen to be numbered.
 */
export const CURRICULUM: Curriculum = [
  think,
  research,
  validate,
  product,
  design,
  build,
  test,
  ship,
  monetize,
  grow,
];

export const allModules = (): { phaseKey: string; module: ModuleSpec }[] =>
  CURRICULUM.flatMap((phase) =>
    phase.modules.map((module) => ({ phaseKey: phase.key, module })),
  );

export const allLessons = (): LessonSpec[] =>
  CURRICULUM.flatMap((phase) => phase.modules.flatMap((module) => module.lessons));

export const allMissions = (): MissionSpec[] =>
  CURRICULUM.flatMap((phase) =>
    phase.modules.flatMap((module) => (module.mission ? [module.mission] : [])),
  );

/**
 * Words that must never reach a learner.
 *
 * The programme spent three prompts removing placeholder language from the
 * interface; this is what stops it coming back through the content. Checked by
 * a test over every string in every lesson and mission.
 */
export const FORBIDDEN_PHRASES = [
  "demo content",
  "placeholder",
  "coming soon",
  "lorem ipsum",
  "to be written",
  "tbd",
  "todo",
  "replaced when",
  "not published yet",
  "example.com/video",
] as const;
