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

/* ── Missions and workspace ───────────────────────────────────────────────── */

export type ProjectStatus =
  | "idea" | "research" | "validation" | "building" | "live" | "paused" | "archived";

export type MissionType =
  | "research" | "decision" | "writing" | "analysis" | "design"
  | "build" | "debug" | "test" | "deploy" | "growth" | "review";

export type MissionStatus =
  | "not_started" | "in_progress" | "submitted" | "needs_work" | "completed";

export type ArtifactStatus = "draft" | "submitted" | "approved" | "needs_work" | "final";

export type EvidenceKind =
  | "url" | "repository" | "commit" | "pull_request" | "deployment" | "document" | "note";

export type ProjectRow = {
  id: string;
  profile_id: string;
  name: string;
  slug: string;
  description: string;
  problem_statement: string;
  target_audience: string;
  current_phase: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type MissionRow = {
  id: string;
  phase_key: string;
  module_id: string | null;
  lesson_id: string | null;
  requires_lesson_id: string | null;
  slug: string;
  title: string;
  summary: string;
  type: MissionType;
  difficulty: LessonDifficulty;
  estimated_minutes: number;
  objective: string;
  why_it_matters: string;
  objectives: string[];
  blocks: unknown;
  deliverable_title: string;
  deliverable_description: string;
  required_evidence: EvidenceKind[];
  requires_reflection: boolean;
  position: number;
  published: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type ArtifactRow = {
  id: string;
  project_id: string;
  profile_id: string;
  mission_id: string | null;
  title: string;
  description: string;
  content: string;
  url: string | null;
  status: ArtifactStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

export type EvidenceRow = {
  id: string;
  artifact_id: string;
  kind: EvidenceKind;
  url: string | null;
  label: string;
  note: string;
  created_at: string;
};

export type ArtifactFeedbackRow = {
  id: string;
  artifact_id: string;
  reviewer_id: string;
  status: ArtifactStatus;
  comment: string;
  created_at: string;
};

export type LearnerMissionProgressRow = {
  profile_id: string;
  mission_id: string;
  project_id: string | null;
  status: MissionStatus;
  reflection: string;
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type BuildLogEntryRow = {
  id: string;
  project_id: string;
  profile_id: string;
  mission_id: string | null;
  artifact_id: string | null;
  occurred_at: string;
  title: string;
  detail: string;
  is_automatic: boolean;
  created_at: string;
};

/* ── Toolbox ──────────────────────────────────────────────────────────────── */

export type ToolboxKindRow =
  | "prompt" | "framework" | "template" | "checklist" | "resource" | "stack_tool";

export type ToolboxItemRow = {
  id: string;
  kind: ToolboxKindRow;
  slug: string;
  title: string;
  summary: string;
  phase_key: string | null;
  tags: string[];
  /* JSONB. Parsed by `lib/toolbox/schemas.ts`, never trusted raw. */
  body: unknown;
  position: number;
  published: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type LearnerSavedItemRow = {
  profile_id: string;
  item_id: string;
  created_at: string;
};

export type LearnerRecentItemRow = {
  profile_id: string;
  item_id: string;
  viewed_at: string;
};

export type LearnerChecklistProgressRow = {
  profile_id: string;
  item_id: string;
  checked_ids: string[];
  updated_at: string;
};

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

      missions: { Row: MissionRow; Insert: MissionRow; Update: Partial<MissionRow>; Relationships: [] };
      mission_prerequisites: {
        Row: { mission_id: string; requires_mission_id: string };
        Insert: { mission_id: string; requires_mission_id: string };
        Update: Partial<{ mission_id: string; requires_mission_id: string }>;
        Relationships: [];
      };

      projects: {
        Row: ProjectRow;
        Insert: { profile_id: string; name: string; slug: string; description?: string };
        Update: {
          name?: string; description?: string; problem_statement?: string;
          target_audience?: string; current_phase?: string | null; status?: ProjectStatus;
        };
        Relationships: [];
      };

      artifacts: {
        Row: ArtifactRow;
        Insert: {
          project_id: string; profile_id: string; mission_id?: string | null;
          title: string; description?: string; content?: string; url?: string | null;
        };
        /* `status` and `submitted_at` are absent: they belong to
           `submit_artifact()` and, later, to a reviewer. */
        Update: { title?: string; description?: string; content?: string; url?: string | null };
        Relationships: [];
      };

      evidence: {
        Row: EvidenceRow;
        Insert: {
          artifact_id: string; kind: EvidenceKind;
          url?: string | null; label?: string; note?: string;
        };
        Update: Partial<EvidenceRow>;
        Relationships: [];
      };

      artifact_feedback: {
        Row: ArtifactFeedbackRow;
        Insert: ArtifactFeedbackRow;
        Update: Partial<ArtifactFeedbackRow>;
        Relationships: [];
      };

      learner_mission_progress: {
        Row: LearnerMissionProgressRow;
        Insert: { profile_id: string; mission_id: string; project_id?: string | null };
        Update: { reflection?: string; project_id?: string | null };
        Relationships: [];
      };

      toolbox_items: {
        Row: ToolboxItemRow;
        /* Platform content: no client write at any privilege level. Typed
           because postgrest-js collapses an unusable relation to `never`. */
        Insert: ToolboxItemRow;
        Update: Partial<ToolboxItemRow>;
        Relationships: [];
      };
      lesson_toolbox_items: {
        Row: { lesson_id: string; item_id: string; position: number };
        Insert: { lesson_id: string; item_id: string; position?: number };
        Update: Partial<{ lesson_id: string; item_id: string; position: number }>;
        Relationships: [];
      };
      mission_toolbox_items: {
        Row: { mission_id: string; item_id: string; position: number };
        Insert: { mission_id: string; item_id: string; position?: number };
        Update: Partial<{ mission_id: string; item_id: string; position: number }>;
        Relationships: [];
      };
      toolbox_item_links: {
        Row: { item_id: string; related_item_id: string };
        Insert: { item_id: string; related_item_id: string };
        Update: Partial<{ item_id: string; related_item_id: string }>;
        Relationships: [];
      };
      learner_saved_items: {
        Row: LearnerSavedItemRow;
        Insert: { profile_id: string; item_id: string };
        Update: Partial<LearnerSavedItemRow>;
        Relationships: [];
      };
      learner_recent_items: {
        Row: LearnerRecentItemRow;
        Insert: { profile_id: string; item_id: string; viewed_at?: string };
        Update: { viewed_at?: string };
        Relationships: [];
      };
      learner_checklist_progress: {
        Row: LearnerChecklistProgressRow;
        Insert: { profile_id: string; item_id: string; checked_ids?: string[] };
        Update: { checked_ids?: string[] };
        Relationships: [];
      };

      build_log_entries: {
        Row: BuildLogEntryRow;
        Insert: {
          project_id: string; profile_id: string; title: string;
          detail?: string; occurred_at?: string;
          mission_id?: string | null; artifact_id?: string | null;
        };
        Update: { title?: string; detail?: string; occurred_at?: string };
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
      submit_artifact: { Args: { p_artifact_id: string }; Returns: ArtifactRow };
      complete_mission: {
        Args: { p_mission_id: string; p_reflection?: string | null };
        Returns: LearnerMissionProgressRow;
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
      project_status: ProjectStatus;
      mission_type: MissionType;
      mission_status: MissionStatus;
      artifact_status: ArtifactStatus;
      evidence_kind: EvidenceKind;
      toolbox_kind: ToolboxKindRow;
    };
    CompositeTypes: Record<never, never>;
  };
}
