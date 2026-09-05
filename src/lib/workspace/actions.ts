"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import { EVIDENCE_NEEDS_URL } from "@/lib/workspace/labels";
import type { EvidenceKind, ProjectStatus } from "@/types/database";
import type { WorkspaceState } from "@/lib/workspace/action-state";

/**
 * Writes for the workspace.
 *
 * The two that change what a thing *means* — submitting work, completing a
 * mission — call database functions rather than writing tables, for the reason
 * Prompt 3 established: a learner holds `authenticated`, so a status column
 * they could write is a status column they could forge. The tables grant no
 * update on `status` or `submitted_at`.
 *
 * The rest are ordinary writes to rows the learner owns, and Row Level Security
 * is what makes that safe. Nothing here reads an owner from a form.
 */

const NOT_CONFIGURED = "LOCK is not connected to a database yet.";

/**
 * A slug from a name, or a fallback.
 *
 * The fallback matters: a project named entirely in a non-Latin script
 * produces an empty slug, and an empty slug fails the check constraint with a
 * database error rather than a sentence. `project` plus a suffix is ugly and
 * works, and the name is what the interface shows anyway.
 */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base.length > 0 ? base : `project-${Date.now().toString(36)}`;
}

/** Start the project. The first thing the workspace asks for, and the only gate. */
export async function createProject(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const name = formData.get("name")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() ?? "";

  if (name.length === 0) return { error: "Give your product a name — you can change it later." };
  if (name.length > 100) return { error: "That name is too long." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ profile_id: user.id, name, slug: slugify(name), description })
    .select("slug")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { error: "You already have a project with that name." };
    return { error: "That did not save. Try again." };
  }

  revalidatePath("/build");
  return { error: null, message: "Project created.", projectSlug: data?.slug };
}

export async function updateProject(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const id = formData.get("projectId")?.toString();
  if (!id) return { error: "That project could not be updated." };

  const status = formData.get("status")?.toString();
  const allowed: ProjectStatus[] = [
    "idea", "research", "validation", "building", "live", "paused", "archived",
  ];

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: formData.get("name")?.toString().trim() || undefined,
      description: formData.get("description")?.toString() ?? undefined,
      problem_statement: formData.get("problemStatement")?.toString() ?? undefined,
      target_audience: formData.get("targetAudience")?.toString() ?? undefined,
      ...(status && allowed.includes(status as ProjectStatus)
        ? { status: status as ProjectStatus }
        : {}),
    })
    .eq("id", id);

  if (error) return { error: "That did not save. Try again." };

  revalidatePath("/build");
  return { error: null, message: "Saved." };
}

/**
 * Save the deliverable.
 *
 * Creates the artifact on first save and updates it afterwards, so the learner
 * never has to think about whether their work exists yet — they type and press
 * save, as they would anywhere else.
 */
export async function saveArtifact(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const projectId = formData.get("projectId")?.toString();
  const missionId = formData.get("missionId")?.toString() ?? null;
  const artifactId = formData.get("artifactId")?.toString();
  const missionSlug = formData.get("missionSlug")?.toString();
  const title = formData.get("title")?.toString().trim() ?? "";
  const content = formData.get("content")?.toString() ?? "";
  const rawUrl = formData.get("url")?.toString().trim() ?? "";

  if (!projectId) return { error: "Start your project before saving work to it." };
  if (title.length === 0) return { error: "Give the deliverable a title." };
  if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
    return { error: "A link has to start with http:// or https://." };
  }

  const supabase = await createClient();
  const url = rawUrl.length > 0 ? rawUrl : null;

  const { error } = artifactId
    ? await supabase.from("artifacts").update({ title, content, url }).eq("id", artifactId)
    : await supabase.from("artifacts").insert({
        project_id: projectId,
        profile_id: user.id,
        mission_id: missionId,
        title,
        content,
        url,
      });

  if (error) return { error: "That did not save. Try again." };

  // Opening a mission does not start it; doing work on it does.
  if (missionId) {
    await supabase
      .from("learner_mission_progress")
      .insert({ profile_id: user.id, mission_id: missionId, project_id: projectId });
  }

  if (missionSlug) revalidatePath(`/learn/missions/${missionSlug}`);
  revalidatePath("/build");
  revalidatePath("/build/artifacts");
  return { error: null, message: "Saved." };
}

/** Attach a piece of proof. */
export async function addEvidence(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const artifactId = formData.get("artifactId")?.toString();
  const kind = formData.get("kind")?.toString() as EvidenceKind | undefined;
  const missionSlug = formData.get("missionSlug")?.toString();
  const url = formData.get("url")?.toString().trim() ?? "";
  const label = formData.get("label")?.toString().trim() ?? "";
  const note = formData.get("note")?.toString().trim() ?? "";

  const kinds: EvidenceKind[] = [
    "url", "repository", "commit", "pull_request", "deployment", "document", "note",
  ];
  if (!artifactId || !kind || !kinds.includes(kind)) {
    return { error: "That evidence could not be added." };
  }

  if (EVIDENCE_NEEDS_URL(kind)) {
    if (!/^https?:\/\//i.test(url)) {
      return { error: "That kind of evidence is a link. Paste the URL." };
    }
  } else if (note.length < 10) {
    return { error: "Write at least a sentence." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("evidence").insert({
    artifact_id: artifactId,
    kind,
    url: EVIDENCE_NEEDS_URL(kind) ? url : null,
    label,
    note,
  });

  if (error) return { error: "That did not save. Try again." };

  if (missionSlug) revalidatePath(`/learn/missions/${missionSlug}`);
  return { error: null, message: "Evidence added." };
}

export async function removeEvidence(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const id = formData.get("evidenceId")?.toString();
  const missionSlug = formData.get("missionSlug")?.toString();
  if (!id) return { error: "That could not be removed." };

  const supabase = await createClient();
  const { error } = await supabase.from("evidence").delete().eq("id", id);
  if (error) return { error: "That did not save. Try again." };

  if (missionSlug) revalidatePath(`/learn/missions/${missionSlug}`);
  return { error: null, message: "Removed." };
}

/**
 * Submit the work.
 *
 * The database checks there is something in it and that every kind of evidence
 * the mission demands is attached. The messages below turn its refusals back
 * into the mission's language — "attach the deployment" is actionable, "check
 * violation" is not.
 */
export async function submitArtifact(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const artifactId = formData.get("artifactId")?.toString();
  const missionSlug = formData.get("missionSlug")?.toString();
  if (!artifactId) return { error: "There is nothing to submit yet." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_artifact", { p_artifact_id: artifactId });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("nothing to submit")) {
      return { error: "Write the deliverable, or add a link to it, before submitting." };
    }
    const missing = /missing evidence: (\w+)/.exec(message);
    if (missing) {
      return { error: `This mission needs ${missing[1]?.replace("_", " ")} evidence before you submit.` };
    }
    return { error: "That did not submit. Try again." };
  }

  if (missionSlug) revalidatePath(`/learn/missions/${missionSlug}`);
  revalidatePath("/build");
  revalidatePath("/build/artifacts");
  revalidatePath("/build/log");
  return { error: null, message: "Submitted." };
}

/** Finish the mission, if the work behind it has actually been done. */
export async function completeMission(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  await requireUser();

  const missionId = formData.get("missionId")?.toString();
  const missionSlug = formData.get("missionSlug")?.toString();
  const reflection = formData.get("reflection")?.toString().trim() ?? "";
  if (!missionId) return { error: "That mission could not be completed." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_mission", {
    p_mission_id: missionId,
    p_reflection: reflection.length > 0 ? reflection : null,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("submit the deliverable")) {
      return { error: "Submit the deliverable before finishing the mission." };
    }
    if (message.includes("needs a reflection")) {
      return { error: "Write what you learned before finishing this mission." };
    }
    return { error: "That did not save. Try again." };
  }

  if (missionSlug) revalidatePath(`/learn/missions/${missionSlug}`);
  revalidatePath("/build");
  revalidatePath("/build/log");
  return { error: null, message: "Mission complete." };
}

/** A learner's own entry in the build log. */
export async function addBuildLogEntry(
  _prev: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const user = await requireUser();

  const projectId = formData.get("projectId")?.toString();
  const title = formData.get("title")?.toString().trim() ?? "";
  const detail = formData.get("detail")?.toString().trim() ?? "";

  if (!projectId) return { error: "Start your project first." };
  if (title.length === 0) return { error: "Say what happened." };
  if (title.length > 200) return { error: "That is too long for a log entry title." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("build_log_entries")
    .insert({ project_id: projectId, profile_id: user.id, title, detail });

  if (error) return { error: "That did not save. Try again." };

  revalidatePath("/build/log");
  return { error: null, message: "Logged." };
}
