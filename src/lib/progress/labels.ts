import type {
  AwardKind,
  ContentStatus,
  SkillArea,
  SkillEvidenceKind,
  SkillState,
  XpEventKind,
} from "@/types/database";

/**
 * The words the progress system uses, in one file.
 *
 * Same reason as `lib/learning/labels.ts` and `lib/workspace/labels.ts`: an
 * enum value is a database identifier, a label is a product decision, and
 * letting a component invent one is how "Demonstrated" becomes "Demonstrated"
 * on one page and "Proven" on another.
 */

export const SKILL_STATE_LABEL: Record<SkillState, string> = {
  not_started: "Not started",
  introduced: "Introduced",
  practicing: "Practising",
  demonstrated: "Demonstrated",
  strong: "Strong",
};

/**
 * What each state actually claims about the person.
 *
 * These sentences are the honesty of the skill system. `introduced` says
 * "taught" and refuses to say "can" — because a lesson is not evidence, and a
 * platform that let a completed lesson read as capability would be lying to
 * the one person it exists to serve.
 */
export const SKILL_STATE_MEANING: Record<SkillState, string> = {
  not_started: "Nothing here yet.",
  introduced: "You have been taught this. Nothing more is claimed.",
  practicing: "You have applied it in work you finished.",
  demonstrated: "You produced work using it that your mentor approved.",
  strong: "You have done that more than once.",
};

/** 0–4. Used for ordering and for how much of the meter is filled. */
export const SKILL_STATE_RANK: Record<SkillState, number> = {
  not_started: 0,
  introduced: 1,
  practicing: 2,
  demonstrated: 3,
  strong: 4,
};

export const SKILL_STATE_COUNT = 4;

export const SKILL_AREA_LABEL: Record<SkillArea, string> = {
  thinking: "Thinking",
  product: "Product",
  design: "Design",
  build: "Build",
  ship: "Ship",
  business: "Business",
};

/** The order the skills page draws the areas in — the order the work happens. */
export const SKILL_AREAS: readonly SkillArea[] = [
  "thinking",
  "product",
  "design",
  "build",
  "ship",
  "business",
] as const;

export const SKILL_EVIDENCE_LABEL: Record<SkillEvidenceKind, string> = {
  lesson_completed: "Lesson completed",
  mission_completed: "Mission completed",
  artifact_approved: "Work approved",
};

export const XP_EVENT_LABEL: Record<XpEventKind, string> = {
  lesson_completed: "Lesson completed",
  mission_completed: "Mission completed",
  artifact_submitted: "Work submitted",
  artifact_approved: "Work approved",
  reflection_submitted: "Reflection written",
  milestone_earned: "Milestone reached",
  project_started: "Project started",
};

export const AWARD_KIND_LABEL: Record<AwardKind, string> = {
  milestone: "Milestone",
  achievement: "Achievement",
};

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  archived: "Archived",
};
