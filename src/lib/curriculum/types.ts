import type { Block } from "@/lib/learning/blocks";
import type {
  EvidenceKind,
  LessonDifficulty,
  LessonType,
  MissionType,
} from "@/types/database";

/**
 * The curriculum, as data.
 *
 * LOCK's content lives in the database, but it is *authored* here, in
 * TypeScript, for three reasons that a SQL file cannot give us:
 *
 *   · every block is typed against the same `Block` union the renderer reads,
 *     so a malformed lesson is a compile error rather than a runtime parse
 *     failure in front of the learner
 *   · `npm test` re-parses the whole programme through the real Zod schema and
 *     enforces the editorial rules below, which is where "no placeholder text"
 *     and "a reflection never gates a lesson" stop being good intentions
 *   · references are by slug, so a lesson pointing at a prerequisite that does
 *     not exist fails in a test rather than as a foreign key error at deploy
 *
 * `scripts/build-curriculum.mjs` turns this into the migration. The migration
 * is committed alongside it: this is the source, that is the artifact.
 *
 * ── The two editorial rules that are enforced, not merely intended ───────────
 *
 * COMPLETION. A lesson completes on `read` or on `knowledge_check`, and on
 * nothing else. The database can also gate completion on a decision or a
 * reflection, and that capability stays — but a subjective answer must never be
 * the thing standing between a learner and the next lesson. Producing something
 * is what a mission is for.
 *
 * TEACH BEFORE ASKING. A graded question may only appear after the lesson has
 * taught what it is checking. That one is a matter of judgement rather than a
 * test, but the shape of a lesson makes it visible: if the first block is a
 * question, the lesson is wrong.
 */

export interface LessonSpec {
  slug: string;
  title: string;
  /** One sentence. Shown in every index and every list. */
  summary: string;
  type: LessonType;
  difficulty: LessonDifficulty;
  minutes: number;
  /** What the learner can do afterwards. Verbs, not topics. */
  objectives: string[];
  /**
   * Deliberately narrower than the database's enum. See the note above: a
   * lesson is finished by reading it, or by passing a check on something it
   * just taught.
   */
  completion: "read" | "knowledge_check";
  blocks: Block[];
  /** Skill keys this lesson develops. */
  skills?: string[];
  /** Toolbox item slugs to surface beside it. */
  toolbox?: string[];
  /** Lesson slugs that must be complete first. Kept rare and always forward. */
  requires?: string[];
}

export interface MissionSpec {
  slug: string;
  title: string;
  summary: string;
  type: MissionType;
  difficulty: LessonDifficulty;
  minutes: number;
  /** The one sentence that says what the learner is going to do. */
  objective: string;
  whyItMatters: string;
  /** What they leave with. */
  objectives: string[];
  blocks: Block[];
  deliverableTitle: string;
  deliverableDescription: string;
  requiredEvidence: EvidenceKind[];
  /** A mission may require a reflection: there, the thinking is the product. */
  requiresReflection?: boolean;
  /** The lesson that must be finished first. Usually the module's last. */
  requiresLesson?: string;
  skills?: { key: string; primary?: boolean }[];
  toolbox?: string[];
}

export interface ModuleSpec {
  slug: string;
  title: string;
  summary: string;
  lessons: LessonSpec[];
  /** Most modules end in one. A module without one is teaching groundwork. */
  mission?: MissionSpec;
}

export interface PhaseSpec {
  /** Must match a row in `public.phases`. */
  key: string;
  modules: ModuleSpec[];
}

export type Curriculum = PhaseSpec[];
