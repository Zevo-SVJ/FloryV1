import type {
  ArtifactStatus, EvidenceKind, MissionStatus, MissionType, ProjectStatus,
} from "@/types/database";

/**
 * The workspace's vocabulary, in one module with no server imports.
 *
 * Shared across the server/client boundary, which is exactly the mistake Prompt
 * 3 made once: a client control importing a label from a `server-only` module
 * pulled the data access layer into the browser bundle.
 */

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  research: "Researching",
  validation: "Validating",
  building: "Building",
  live: "Live",
  paused: "Paused",
  archived: "Archived",
};

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  needs_work: "Needs work",
  completed: "Completed",
};

export const ARTIFACT_STATUS_LABEL: Record<ArtifactStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  needs_work: "Needs work",
  final: "Final",
};

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  research: "Research", decision: "Decision", writing: "Writing",
  analysis: "Analysis", design: "Design", build: "Build", debug: "Debug",
  test: "Test", deploy: "Deploy", growth: "Growth", review: "Review",
};

/**
 * What each kind of proof is, in the words the learner needs to supply it.
 *
 * The prompt beside the field matters more than the label above it: "the URL
 * anyone can open" gets a production link, "Deployment" gets a shrug.
 */
export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  url: "Link",
  repository: "Repository",
  commit: "Commit",
  pull_request: "Pull request",
  deployment: "Deployment",
  document: "Document",
  note: "Written note",
};

export const EVIDENCE_KIND_HINT: Record<EvidenceKind, string> = {
  url: "Any link that shows the work.",
  repository: "The GitHub repository holding the code.",
  commit: "A commit URL — the change itself, not the branch.",
  pull_request: "The pull request where the change was reviewed.",
  deployment: "The production URL anyone can open.",
  document: "A link to the document you produced.",
  note: "Written proof, where a link would not exist. At least a sentence.",
};

/** The kinds that are a link, and are refused without one. */
export const EVIDENCE_NEEDS_URL = (kind: EvidenceKind): boolean => kind !== "note";
