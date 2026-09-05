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

/**
 * The editorial lifecycle of a piece of content, and the authoritative column.
 * `published` is generated from it — `status = 'published'` — so the two can
 * never disagree, and writing `published` directly is refused by the database.
 */
export type ContentStatus = "draft" | "review" | "published" | "archived";

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
  status: ContentStatus;
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
  status: ContentStatus;
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
  status: ContentStatus;
  published: boolean;
  content_version: number;
  published_at: string | null;
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

export type ArtifactStatus =
  | "draft" | "submitted" | "in_review" | "approved" | "needs_work" | "final";

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
  /* When true, `complete_mission()` refuses until a mentor has approved. */
  requires_review: boolean;
  position: number;
  status: ContentStatus;
  published: boolean;
  content_version: number;
  published_at: string | null;
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
  /* The four fields that make feedback actionable. A `needs_work` verdict is
     refused by the database unless the last two say something. */
  what_works: string;
  what_needs_work: string;
  why: string;
  next_step: string;
  category: FeedbackCategory;
  created_at: string;
  updated_at: string;
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
  status: ContentStatus;
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

/* ── Mentor and admin ─────────────────────────────────────────────────────── */

export type FeedbackCategory =
  | "product" | "research" | "ux" | "technical" | "business" | "quality" | "other";

export type QuestionStatus = "open" | "answered" | "closed";

export type NotificationKind =
  | "artifact_submitted" | "artifact_reviewed" | "question_asked" | "question_answered";

export type MentorRelationshipRow = {
  learner_id: string;
  mentor_id: string;
  created_at: string;
};

export type MentorNoteRow = {
  id: string;
  learner_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type MentorQuestionRow = {
  id: string;
  learner_id: string;
  mentor_id: string | null;
  project_id: string | null;
  mission_id: string | null;
  artifact_id: string | null;
  question: string;
  response: string;
  status: QuestionStatus;
  created_at: string;
  answered_at: string | null;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  profile_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

/* ── Progress, skills, milestones, XP ────────────────────────────────────── */

export type SkillArea = "thinking" | "product" | "design" | "build" | "ship" | "business";

/**
 * The five states, in order. The order is meaning, not presentation: nothing
 * reaches `demonstrated` without somebody else approving the work behind it.
 */
export type SkillState =
  | "not_started" | "introduced" | "practicing" | "demonstrated" | "strong";

export type SkillEvidenceKind =
  | "lesson_completed" | "mission_completed" | "artifact_approved";

export type XpEventKind =
  | "lesson_completed" | "mission_completed" | "artifact_submitted"
  | "artifact_approved" | "reflection_submitted" | "milestone_earned"
  | "project_started";

export type AwardKind = "milestone" | "achievement";

export type MilestoneRequirement =
  | "project_started" | "lessons_completed" | "missions_completed"
  | "mission_completed" | "artifacts_submitted" | "artifacts_approved"
  | "evidence_submitted" | "skill_demonstrated" | "phase_completed" | "manual";

export type SkillRow = {
  key: string;
  area: SkillArea;
  label: string;
  summary: string;
  demonstrates: string;
  position: number;
  status: ContentStatus;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type SkillEvidenceRow = {
  id: string;
  profile_id: string;
  skill_key: string;
  kind: SkillEvidenceKind;
  lesson_id: string | null;
  mission_id: string | null;
  artifact_id: string | null;
  detail: string;
  occurred_at: string;
};

export type XpRuleRow = {
  kind: XpEventKind;
  amount: number;
  label: string;
  rationale: string;
};

export type XpEventRow = {
  id: string;
  profile_id: string;
  kind: XpEventKind;
  amount: number;
  subject_type: string;
  subject_key: string;
  detail: string;
  created_at: string;
};

export type MilestoneRow = {
  key: string;
  kind: AwardKind;
  title: string;
  summary: string;
  description: string;
  icon: string;
  requirement: MilestoneRequirement;
  requirement_config: Record<string, unknown>;
  position: number;
  status: ContentStatus;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type LearnerMilestoneRow = {
  profile_id: string;
  milestone_key: string;
  earned_at: string;
  awarded_by: string | null;
  note: string;
};

/* ── The derived views ───────────────────────────────────────────────────────
 *
 * Every one of these is computed on read from the records above. There is no
 * table behind them holding a progress figure, which is why none of them has an
 * `Insert` shape worth writing: the database would refuse it, and so would the
 * design.
 */

export type LearnerSkillStateRow = {
  profile_id: string;
  skill_key: string;
  area: SkillArea;
  label: string;
  summary: string;
  demonstrates: string;
  position: number;
  lessons_count: number;
  missions_count: number;
  approvals_count: number;
  last_evidence_at: string | null;
  state: SkillState;
};

export type LearnerXpTotalRow = {
  profile_id: string;
  total: number;
  events: number;
  last_earned_at: string | null;
};

export type LearnerPhaseProgressRow = {
  profile_id: string;
  phase_key: string;
  position: number;
  label: string;
  summary: string;
  lessons_total: number;
  lessons_done: number;
  missions_total: number;
  missions_done: number;
  units_total: number;
  units_done: number;
  /** Null when the phase has nothing published. Never 0 in that case. */
  percent: number | null;
};

export type LearnerModuleProgressRow = {
  profile_id: string;
  module_id: string;
  phase_key: string;
  title: string;
  position: number;
  lessons_total: number;
  lessons_done: number;
};

export type LearnerOverallProgressRow = {
  profile_id: string;
  lessons_total: number;
  lessons_done: number;
  missions_total: number;
  missions_done: number;
  units_total: number;
  units_done: number;
  phases_complete: number;
  phases_started_or_available: number;
  percent: number | null;
};

export type LearnerActivityRow = {
  profile_id: string;
  source: "build_log" | "lesson" | "milestone";
  occurred_at: string;
  title: string;
  detail: string;
  mission_id: string | null;
  artifact_id: string | null;
  lesson_id: string | null;
  milestone_key: string | null;
};

export type LearnerStreakRow = {
  profile_id: string;
  current_days: number | null;
  active_days: number;
  last_active_on: string | null;
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

      learner_mentor_relationships: {
        Row: MentorRelationshipRow;
        Insert: MentorRelationshipRow;
        Update: Partial<MentorRelationshipRow>;
        Relationships: [];
      };
      mentor_notes: {
        Row: MentorNoteRow;
        Insert: { learner_id: string; author_id: string; body: string };
        Update: { body?: string };
        Relationships: [];
      };
      mentor_questions: {
        Row: MentorQuestionRow;
        /* The learner writes the question. Only `answer_question()` writes a
           response — there is no client grant for it. */
        Insert: {
          learner_id: string; question: string;
          project_id?: string | null; mission_id?: string | null; artifact_id?: string | null;
        };
        Update: { question?: string };
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationRow;
        Update: { read_at?: string | null };
        Relationships: [];
      };

      /* Definitions, authored with SQL. No client write at any role. */
      skills: { Row: SkillRow; Insert: SkillRow; Update: Partial<SkillRow>; Relationships: [] };
      lesson_skills: {
        Row: { lesson_id: string; skill_key: string };
        Insert: { lesson_id: string; skill_key: string };
        Update: Partial<{ lesson_id: string; skill_key: string }>;
        Relationships: [];
      };
      mission_skills: {
        Row: { mission_id: string; skill_key: string; is_primary: boolean };
        Insert: { mission_id: string; skill_key: string; is_primary?: boolean };
        Update: Partial<{ mission_id: string; skill_key: string; is_primary: boolean }>;
        Relationships: [];
      };
      milestones: {
        Row: MilestoneRow; Insert: MilestoneRow; Update: Partial<MilestoneRow>; Relationships: [];
      };
      xp_rules: {
        Row: XpRuleRow; Insert: XpRuleRow; Update: Partial<XpRuleRow>; Relationships: [];
      };

      /*
       * Earned records. `Insert` and `Update` describe writes the database
       * refuses at every role — there is no grant for them — and are typed only
       * because postgrest-js collapses a relation whose write shapes are
       * unusable to `never`, which would take `select()` down with it.
       */
      skill_evidence: {
        Row: SkillEvidenceRow;
        Insert: SkillEvidenceRow;
        Update: Partial<SkillEvidenceRow>;
        Relationships: [];
      };
      xp_events: {
        Row: XpEventRow; Insert: XpEventRow; Update: Partial<XpEventRow>; Relationships: [];
      };
      learner_milestones: {
        Row: LearnerMilestoneRow;
        Insert: LearnerMilestoneRow;
        Update: Partial<LearnerMilestoneRow>;
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
    Views: {
      learner_skill_states: { Row: LearnerSkillStateRow; Relationships: [] };
      learner_xp_totals: { Row: LearnerXpTotalRow; Relationships: [] };
      learner_module_progress: { Row: LearnerModuleProgressRow; Relationships: [] };
      learner_phase_progress: { Row: LearnerPhaseProgressRow; Relationships: [] };
      learner_overall_progress: { Row: LearnerOverallProgressRow; Relationships: [] };
      learner_activity: { Row: LearnerActivityRow; Relationships: [] };
      learner_streak: { Row: LearnerStreakRow; Relationships: [] };
    };
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
      can_review: { Args: { p_learner_id: string }; Returns: boolean };
      review_artifact: {
        Args: {
          p_artifact_id: string;
          p_status: ArtifactStatus;
          p_what_works?: string;
          p_what_needs_work?: string;
          p_why?: string;
          p_next_step?: string;
          p_category?: FeedbackCategory;
        };
        Returns: ArtifactFeedbackRow;
      };
      answer_question: {
        Args: { p_question_id: string; p_response: string };
        Returns: MentorQuestionRow;
      };
      complete_mission: {
        Args: { p_mission_id: string; p_reflection?: string | null };
        Returns: LearnerMissionProgressRow;
      };
      /* The only progress-writing function a client may call, and it refuses
         anybody who is not staff, and staff acting on themselves. */
      award_milestone: {
        Args: { p_profile_id: string; p_milestone_key: string; p_note?: string };
        Returns: LearnerMilestoneRow;
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
      feedback_category: FeedbackCategory;
      question_status: QuestionStatus;
      notification_kind: NotificationKind;
      content_status: ContentStatus;
      skill_area: SkillArea;
      skill_state: SkillState;
      skill_evidence_kind: SkillEvidenceKind;
      xp_event_kind: XpEventKind;
      award_kind: AwardKind;
      milestone_requirement: MilestoneRequirement;
    };
    CompositeTypes: Record<never, never>;
  };
}
