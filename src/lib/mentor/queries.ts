import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/dal";
import { AWAITING_REVIEW } from "@/lib/mentor/labels";
import type {
  ArtifactFeedbackRow, ArtifactRow, EvidenceRow, MentorNoteRow, MentorQuestionRow,
  MissionRow, NotificationRow, Profile, ProjectRow,
} from "@/types/database";

/**
 * Reads for the mentor layer.
 *
 * Every one runs as the signed-in account, so `can_review()` in the policies
 * decides what comes back. None of these filters by learner id for security —
 * they filter for display. A mentor with no assignment to a learner gets an
 * empty result from the database, not a hidden section in the interface.
 */

export interface ReviewQueueEntry {
  artifact: ArtifactRow;
  mission: MissionRow | null;
  project: ProjectRow | null;
  learner: Profile | null;
  evidenceCount: number;
}

/** Work sitting with the mentor, oldest first — the longest wait goes first. */
export const getReviewQueue = cache(async (): Promise<ReviewQueueEntry[]> => {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: artifacts } = await supabase
    .from("artifacts")
    .select("*")
    .in("status", AWAITING_REVIEW)
    .order("submitted_at", { ascending: true });

  // A mentor's own work is not their queue.
  const rows = (artifacts ?? []).filter((row) => row.profile_id !== profile.id);
  if (rows.length === 0) return [];

  const [missions, projects, learners, evidence] = await Promise.all([
    supabase.from("missions").select("*"),
    supabase.from("projects").select("*"),
    supabase.from("profiles").select("*"),
    supabase.from("evidence").select("artifact_id").in("artifact_id", rows.map((r) => r.id)),
  ]);

  const missionById = new Map((missions.data ?? []).map((row) => [row.id, row]));
  const projectById = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const learnerById = new Map((learners.data ?? []).map((row) => [row.id, row]));

  const evidenceCounts = new Map<string, number>();
  for (const row of evidence.data ?? []) {
    evidenceCounts.set(row.artifact_id, (evidenceCounts.get(row.artifact_id) ?? 0) + 1);
  }

  return rows.map((artifact) => ({
    artifact,
    mission: artifact.mission_id ? (missionById.get(artifact.mission_id) ?? null) : null,
    project: projectById.get(artifact.project_id) ?? null,
    learner: learnerById.get(artifact.profile_id) ?? null,
    evidenceCount: evidenceCounts.get(artifact.id) ?? 0,
  }));
});

export interface LearnerSummary {
  learner: Profile;
  project: ProjectRow | null;
  lessonsCompleted: number;
  missionsCompleted: number;
  pendingReviews: number;
  openQuestions: number;
  lastActivity: string | null;
}

/** The learners this account may review. Empty for a mentor with no pairing. */
export const getAssignedLearners = cache(async (): Promise<LearnerSummary[]> => {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [relationships, profiles] = await Promise.all([
    supabase.from("learner_mentor_relationships").select("*"),
    supabase.from("profiles").select("*"),
  ]);

  /*
   * An admin may review everybody, so their list is every learner rather than
   * only the ones paired to them. A mentor's list comes from the pairings the
   * policy already let them read.
   */
  const learnerIds =
    profile.role === "admin"
      ? (profiles.data ?? []).filter((row) => row.id !== profile.id).map((row) => row.id)
      : (relationships.data ?? [])
          .filter((row) => row.mentor_id === profile.id)
          .map((row) => row.learner_id);

  if (learnerIds.length === 0) return [];

  const [projects, lessons, missions, artifacts, questions] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("learner_lesson_progress").select("profile_id,status,updated_at"),
    supabase.from("learner_mission_progress").select("profile_id,status,updated_at"),
    supabase.from("artifacts").select("profile_id,status"),
    supabase.from("mentor_questions").select("learner_id,status"),
  ]);

  const profileById = new Map((profiles.data ?? []).map((row) => [row.id, row]));

  return learnerIds
    .map((id) => profileById.get(id))
    .filter((row): row is Profile => row !== undefined)
    .map((learner) => {
      const lessonRows = (lessons.data ?? []).filter((r) => r.profile_id === learner.id);
      const missionRows = (missions.data ?? []).filter((r) => r.profile_id === learner.id);

      const times = [...lessonRows, ...missionRows]
        .map((r) => r.updated_at)
        .sort()
        .reverse();

      return {
        learner,
        project: (projects.data ?? []).find((p) => p.profile_id === learner.id) ?? null,
        lessonsCompleted: lessonRows.filter((r) => r.status === "completed").length,
        missionsCompleted: missionRows.filter((r) => r.status === "completed").length,
        pendingReviews: (artifacts.data ?? []).filter(
          (a) => a.profile_id === learner.id && AWAITING_REVIEW.includes(a.status),
        ).length,
        openQuestions: (questions.data ?? []).filter(
          (q) => q.learner_id === learner.id && q.status === "open",
        ).length,
        lastActivity: times[0] ?? null,
      };
    });
});

export interface LearnerDetail extends LearnerSummary {
  artifacts: ArtifactRow[];
  notes: MentorNoteRow[];
  questions: MentorQuestionRow[];
  buildLog: { id: string; title: string; detail: string; occurred_at: string }[];
}

export const getLearnerDetail = cache(async (learnerId: string): Promise<LearnerDetail | null> => {
  const learners = await getAssignedLearners();
  const summary = learners.find((entry) => entry.learner.id === learnerId);
  if (!summary) return null;

  const supabase = await createClient();
  const [artifacts, notes, questions, log] = await Promise.all([
    supabase.from("artifacts").select("*").eq("profile_id", learnerId).order("updated_at", { ascending: false }),
    supabase.from("mentor_notes").select("*").eq("learner_id", learnerId).order("created_at", { ascending: false }),
    supabase.from("mentor_questions").select("*").eq("learner_id", learnerId).order("created_at", { ascending: false }),
    supabase.from("build_log_entries").select("id,title,detail,occurred_at").eq("profile_id", learnerId).order("occurred_at", { ascending: false }).limit(10),
  ]);

  return {
    ...summary,
    artifacts: artifacts.data ?? [],
    notes: notes.data ?? [],
    questions: questions.data ?? [],
    buildLog: log.data ?? [],
  };
});

export interface ReviewSubject {
  artifact: ArtifactRow;
  mission: MissionRow | null;
  project: ProjectRow | null;
  learner: Profile | null;
  evidence: EvidenceRow[];
  history: ArtifactFeedbackRow[];
}

/** Everything the review workspace needs, in one read. */
export const getReviewSubject = cache(async (artifactId: string): Promise<ReviewSubject | null> => {
  const supabase = await createClient();

  const { data: artifact } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", artifactId)
    .maybeSingle();

  if (!artifact) return null;

  const [mission, project, learner, evidence, history] = await Promise.all([
    artifact.mission_id
      ? supabase.from("missions").select("*").eq("id", artifact.mission_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("projects").select("*").eq("id", artifact.project_id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", artifact.profile_id).maybeSingle(),
    supabase.from("evidence").select("*").eq("artifact_id", artifactId).order("created_at"),
    supabase
      .from("artifact_feedback")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    artifact,
    mission: mission.data ?? null,
    project: project.data ?? null,
    learner: learner.data ?? null,
    evidence: evidence.data ?? [],
    history: history.data ?? [],
  };
});

/* ── The learner's side ──────────────────────────────────────────────────── */

export interface LearnerMentorView {
  mentor: Profile | null;
  /** Reviews on this learner's work, newest first. The history, not a summary. */
  feedback: (ArtifactFeedbackRow & { artifactTitle: string })[];
  awaitingReview: ArtifactRow[];
  needsWork: ArtifactRow[];
  questions: MentorQuestionRow[];
}

export const getLearnerMentorView = cache(async (): Promise<LearnerMentorView> => {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [relationship, artifacts, questions] = await Promise.all([
    supabase.from("learner_mentor_relationships").select("mentor_id").eq("learner_id", profile.id).maybeSingle(),
    supabase.from("artifacts").select("*").eq("profile_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("mentor_questions").select("*").eq("learner_id", profile.id).order("created_at", { ascending: false }),
  ]);

  const mentor = relationship.data
    ? ((await supabase.from("profiles").select("*").eq("id", relationship.data.mentor_id).maybeSingle()).data ?? null)
    : null;

  const rows = artifacts.data ?? [];
  const titleById = new Map(rows.map((row) => [row.id, row.title]));

  const feedback = rows.length
    ? ((
        await supabase
          .from("artifact_feedback")
          .select("*")
          .in("artifact_id", rows.map((row) => row.id))
          .order("created_at", { ascending: false })
      ).data ?? [])
    : [];

  return {
    mentor,
    feedback: feedback.map((row) => ({
      ...row,
      artifactTitle: titleById.get(row.artifact_id) ?? "Your work",
    })),
    awaitingReview: rows.filter((row) => AWAITING_REVIEW.includes(row.status)),
    needsWork: rows.filter((row) => row.status === "needs_work"),
    questions: questions.data ?? [],
  };
});

/** Reviews on one artifact, for the learner's own mission page. */
export const getArtifactFeedback = cache(
  async (artifactId: string): Promise<ArtifactFeedbackRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("artifact_feedback")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("created_at", { ascending: false });
    return data ?? [];
  },
);

export const getNotifications = cache(async (limit = 12): Promise<NotificationRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
});
