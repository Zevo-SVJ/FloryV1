import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/dal";
import { parseBlocks, type Block } from "@/lib/learning/blocks";
import type {
  ArtifactRow, BuildLogEntryRow, EvidenceRow, LearnerMissionProgressRow,
  MissionRow, ProjectRow,
} from "@/types/database";

/**
 * Reads for the workspace.
 *
 * Every one runs as the signed-in learner, so Row Level Security decides what
 * comes back. None of these filters by `profile_id`: the policies already do,
 * and a query that filtered by a value from the request would be the bug those
 * policies exist to prevent.
 */

/**
 * The learner's project.
 *
 * One, not a list. The schema allows several — a learner might eventually build
 * a second product — but the workspace is written around "your SaaS" in the
 * singular, because that is what the program is: one product, carried through
 * ten phases. The most recently touched one wins if there are ever two.
 */
export const getProject = cache(async (): Promise<ProjectRow | null> => {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
});

export interface MissionSummary {
  mission: MissionRow;
  progress: LearnerMissionProgressRow | null;
  artifact: ArtifactRow | null;
}

/** Every published mission, with what this learner has done about each. */
export const getMissions = cache(async (): Promise<MissionSummary[]> => {
  const supabase = await createClient();

  const [missions, progress, artifacts] = await Promise.all([
    supabase.from("missions").select("*").order("position"),
    supabase.from("learner_mission_progress").select("*"),
    supabase.from("artifacts").select("*"),
  ]);

  const progressByMission = new Map(
    (progress.data ?? []).map((row) => [row.mission_id, row]),
  );
  const artifactByMission = new Map(
    (artifacts.data ?? [])
      .filter((row) => row.mission_id !== null)
      .map((row) => [row.mission_id as string, row]),
  );

  return (missions.data ?? []).map((mission) => ({
    mission,
    progress: progressByMission.get(mission.id) ?? null,
    artifact: artifactByMission.get(mission.id) ?? null,
  }));
});

export interface MissionDetail extends MissionSummary {
  blocks: Block[];
  rejectedBlocks: number;
  evidence: EvidenceRow[];
  /** Prerequisite missions, with whether each is done. */
  prerequisites: { mission: MissionRow; met: boolean }[];
  /** The lesson this mission applies, and whether it has been completed. */
  requiredLesson: { id: string; title: string; slug: string; met: boolean } | null;
  unlocked: boolean;
  project: ProjectRow | null;
}

export const getMission = cache(async (slug: string): Promise<MissionDetail | null> => {
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!mission) return null;

  const [progressResult, artifactResult, prereqResult, project] = await Promise.all([
    supabase.from("learner_mission_progress").select("*").eq("mission_id", mission.id).maybeSingle(),
    supabase.from("artifacts").select("*").eq("mission_id", mission.id).maybeSingle(),
    supabase.from("mission_prerequisites").select("*").eq("mission_id", mission.id),
    getProject(),
  ]);

  const artifact = artifactResult.data ?? null;

  const evidenceResult = artifact
    ? await supabase.from("evidence").select("*").eq("artifact_id", artifact.id).order("created_at")
    : null;

  const prerequisites = await resolveMissionPrerequisites(
    (prereqResult.data ?? []).map((row) => row.requires_mission_id),
  );

  const requiredLesson = await resolveRequiredLesson(mission.requires_lesson_id);
  const { blocks, rejected } = parseBlocks(mission.blocks);

  return {
    mission,
    progress: progressResult.data ?? null,
    artifact,
    blocks,
    rejectedBlocks: rejected,
    evidence: evidenceResult?.data ?? [],
    prerequisites,
    requiredLesson,
    /*
     * Locked only by an unfinished prerequisite mission or an unfinished
     * required lesson. Deliberately not "everything before it in order" — the
     * program is a sequence, but a learner who wants to read ahead is not
     * cheating, and a wall in front of every mission would make LOCK feel like
     * a school rather than a workspace.
     */
    unlocked:
      prerequisites.every((entry) => entry.met) && (requiredLesson?.met ?? true),
    project,
  };
});

async function resolveMissionPrerequisites(
  ids: string[],
): Promise<{ mission: MissionRow; met: boolean }[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();

  const [missions, progress] = await Promise.all([
    supabase.from("missions").select("*").in("id", ids),
    supabase.from("learner_mission_progress").select("*").in("mission_id", ids),
  ]);

  const done = new Set(
    (progress.data ?? []).filter((row) => row.status === "completed").map((row) => row.mission_id),
  );

  return (missions.data ?? []).map((mission) => ({ mission, met: done.has(mission.id) }));
}

async function resolveRequiredLesson(lessonId: string | null) {
  if (!lessonId) return null;
  const supabase = await createClient();

  const [lesson, progress] = await Promise.all([
    supabase.from("lessons").select("id,title,slug").eq("id", lessonId).maybeSingle(),
    supabase.from("learner_lesson_progress").select("status").eq("lesson_id", lessonId).maybeSingle(),
  ]);

  if (!lesson.data) return null;

  return {
    id: lesson.data.id,
    title: lesson.data.title,
    slug: lesson.data.slug,
    met: progress.data?.status === "completed",
  };
}

export interface ArtifactWithContext {
  artifact: ArtifactRow;
  mission: MissionRow | null;
  evidence: EvidenceRow[];
}

/** Everything the learner has produced, newest first. The project archive. */
export const getArtifacts = cache(async (): Promise<ArtifactWithContext[]> => {
  const supabase = await createClient();

  const [artifacts, missions] = await Promise.all([
    supabase.from("artifacts").select("*").order("created_at", { ascending: false }),
    supabase.from("missions").select("*"),
  ]);

  const rows = artifacts.data ?? [];
  if (rows.length === 0) return [];

  const evidence = await supabase
    .from("evidence")
    .select("*")
    .in("artifact_id", rows.map((row) => row.id));

  const missionById = new Map((missions.data ?? []).map((row) => [row.id, row]));
  const evidenceByArtifact = new Map<string, EvidenceRow[]>();
  for (const row of evidence.data ?? []) {
    const list = evidenceByArtifact.get(row.artifact_id) ?? [];
    list.push(row);
    evidenceByArtifact.set(row.artifact_id, list);
  }

  return rows.map((artifact) => ({
    artifact,
    mission: artifact.mission_id ? (missionById.get(artifact.mission_id) ?? null) : null,
    evidence: evidenceByArtifact.get(artifact.id) ?? [],
  }));
});

export const getBuildLog = cache(async (): Promise<BuildLogEntryRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("build_log_entries")
    .select("*")
    .order("occurred_at", { ascending: false });
  return data ?? [];
});

/**
 * What the workspace shows at the top: where you are, and what is next.
 *
 * "Current" is the first mission that is neither completed nor locked, in
 * program order. "Next" is the one after it. Both are null when there is
 * nothing published, and the interface says so rather than inventing a task.
 */
export interface WorkspaceSnapshot {
  project: ProjectRow | null;
  current: MissionSummary | null;
  next: MissionSummary | null;
  completedCount: number;
  totalCount: number;
  latestArtifact: ArtifactRow | null;
}

export const getWorkspaceSnapshot = cache(async (): Promise<WorkspaceSnapshot> => {
  const [project, missions, artifacts] = await Promise.all([
    getProject(),
    getMissions(),
    getArtifacts(),
  ]);

  const open = missions.filter((entry) => entry.progress?.status !== "completed");

  return {
    project,
    current: open[0] ?? null,
    next: open[1] ?? null,
    completedCount: missions.filter((entry) => entry.progress?.status === "completed").length,
    totalCount: missions.length,
    latestArtifact: artifacts[0]?.artifact ?? null,
  };
});
