/**
 * The database, in TypeScript.
 *
 * Hand-written rather than generated, and kept that way while the schema is one
 * table: `supabase gen types` needs a running project or the CLI, which is a
 * dependency and a step in front of every clone for something a person can read
 * in thirty seconds. The moment the schema grows past what fits on a screen,
 * switch to generation — the shape below is deliberately the shape the
 * generator emits, so that swap is a file replacement and not a refactor.
 *
 * `Insert` and `Update` are narrower than `Row` on purpose. They describe what
 * may be written, and the database agrees: `role` is absent from both, because
 * no client holds the column privilege to set it. A type that offered that
 * field would be describing a request the server will refuse.
 *
 * `Insert` is typed rather than removed because `postgrest-js` derives the
 * builder's generics from it and collapses the whole table to `never` when it
 * is unusable — which makes `update()` uncallable too. It is unreachable from
 * the application anyway: `profiles` has no insert policy, so the only thing
 * that ever inserts one is the signup trigger, running as the table owner.
 *
 * Everything here is a `type`, never an `interface`, and that is load-bearing
 * rather than a style preference. `postgrest-js` constrains a table to
 * `Record<string, unknown>`; TypeScript gives a type alias an implicit index
 * signature and an interface none, so a `Row` declared as an interface fails
 * the constraint, the whole relation silently degrades to `never`, and
 * `update()` reports that its argument is not assignable to `never` — an error
 * message pointing at the call site rather than at this file.
 */

export type AppRole = "learner" | "mentor" | "admin";

/* ── Learning system ──────────────────────────────────────────────────────── */

export type LessonType =
  | "lesson" | "concept" | "visual" | "example" | "teardown" | "decision"
  | "workshop" | "build" | "debug" | "case_study" | "checkpoint" | "reflection";

export type LessonDifficulty = "foundational" | "intermediate" | "advanced";
export type CompletionRule = "read" | "knowledge_check" | "decision" | "reflection" | "practical";
export type LessonProgressStatus = "in_progress" | "completed";
export type ConfidenceLevel = "solid" | "shaky" | "revisit";
export type ResourceKind = "video" | "article" | "doc" | "tool" | "repo";

export type PhaseRow = {
  key: string;
  position: number;
  label: string;
  summary: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type ModuleRow = {
  id: string;
  phase_key: string;
  slug: string;
  title: string;
  summary: string;
  position: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string;
  type: LessonType;
  difficulty: LessonDifficulty;
  estimated_minutes: number;
  objectives: string[];
  /* JSONB. Parsed by `lib/learning/blocks.ts`, never trusted raw. */
  blocks: unknown;
  completion_rule: CompletionRule;
  position: number;
  published: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type LessonPrerequisiteRow = { lesson_id: string; requires_lesson_id: string };

export type LessonResourceRow = {
  id: string;
  lesson_id: string;
  kind: ResourceKind;
  title: string;
  url: string;
  source: string | null;
  duration_seconds: number | null;
  why: string;
  start_seconds: number | null;
  position: number;
  created_at: string;
};

export type LearnerLessonProgressRow = {
  profile_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  last_block_id: string | null;
  confidence: ConfidenceLevel | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type LearnerBlockResponseRow = {
  profile_id: string;
  lesson_id: string;
  block_id: string;
  response: unknown;
  is_correct: boolean | null;
  attempts: number;
  created_at: string;
  updated_at: string;
};

export type LearnerLessonNoteRow = {
  profile_id: string;
  lesson_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };

      /*
       * Content is read-only to every client — authored with SQL by the owner —
       * so `Insert` and `Update` describe writes the database will refuse. They
       * are typed rather than removed because postgrest-js collapses a whole
       * relation to `never` when they are unusable, which makes even `select()`
       * uncallable.
       */
      phases: { Row: PhaseRow; Insert: PhaseRow; Update: Partial<PhaseRow>; Relationships: [] };
      modules: { Row: ModuleRow; Insert: ModuleRow; Update: Partial<ModuleRow>; Relationships: [] };
      lessons: { Row: LessonRow; Insert: LessonRow; Update: Partial<LessonRow>; Relationships: [] };
      lesson_prerequisites: {
        Row: LessonPrerequisiteRow;
        Insert: LessonPrerequisiteRow;
        Update: Partial<LessonPrerequisiteRow>;
        Relationships: [];
      };
      lesson_resources: {
        Row: LessonResourceRow;
        Insert: LessonResourceRow;
        Update: Partial<LessonResourceRow>;
        Relationships: [];
      };

      learner_lesson_progress: {
        Row: LearnerLessonProgressRow;
        /* Only the two columns the grant allows. `status` and `completed_at`
           belong to `complete_lesson()`. */
        Insert: { profile_id: string; lesson_id: string };
        Update: { last_block_id?: string | null; confidence?: ConfidenceLevel | null };
        Relationships: [];
      };
      learner_block_responses: {
        Row: LearnerBlockResponseRow;
        /* No client write at all: every response goes through
           `record_block_response()`, which computes `is_correct`. */
        Insert: LearnerBlockResponseRow;
        Update: Partial<LearnerBlockResponseRow>;
        Relationships: [];
      };
      learner_lesson_notes: {
        Row: LearnerLessonNoteRow;
        Insert: { profile_id: string; lesson_id: string; body: string };
        Update: { body?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      record_block_response: {
        Args: { p_lesson_id: string; p_block_id: string; p_response: unknown };
        Returns: LearnerBlockResponseRow;
      };
      complete_lesson: {
        Args: { p_lesson_id: string };
        Returns: LearnerLessonProgressRow;
      };
    };
    Enums: {
      app_role: AppRole;
      lesson_type: LessonType;
      lesson_difficulty: LessonDifficulty;
      completion_rule: CompletionRule;
      lesson_progress_status: LessonProgressStatus;
      confidence_level: ConfidenceLevel;
      resource_kind: ResourceKind;
    };
    CompositeTypes: Record<never, never>;
  };
}
