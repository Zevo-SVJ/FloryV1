"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Card, Label, Badge } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";
import {
  addEvidence, completeMission, removeEvidence, saveArtifact, submitArtifact,
} from "@/lib/workspace/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";
import {
  ARTIFACT_STATUS_LABEL, EVIDENCE_KIND_HINT, EVIDENCE_KIND_LABEL,
} from "@/lib/workspace/labels";
import type { ArtifactRow, EvidenceKind, EvidenceRow, MissionRow } from "@/types/database";

/**
 * Where the work happens.
 *
 * Four forms in sequence, and the sequence is the workflow: write the
 * deliverable, attach the proof, submit it, close the mission. Each one is a
 * separate form rather than one large one, because they succeed and fail
 * independently — losing a written brief because a URL was malformed would be
 * unforgivable, and a single form makes that easy to do.
 *
 * Nothing here decides anything. Submission and completion are refused or
 * granted by the database; these forms carry the refusal back in the mission's
 * own words.
 */

export function MissionWorkspace({
  mission,
  projectId,
  artifact,
  evidence,
  reflection,
  completed,
}: {
  mission: MissionRow;
  projectId: string;
  artifact: ArtifactRow | null;
  evidence: EvidenceRow[];
  reflection: string;
  completed: boolean;
}) {
  const submitted = artifact !== null && artifact.status !== "draft";

  return (
    <div className="max-w-read space-y-6">
      <DeliverableForm mission={mission} projectId={projectId} artifact={artifact} />

      {artifact ? (
        <>
          <EvidencePanel mission={mission} artifact={artifact} evidence={evidence} />
          <SubmitPanel mission={mission} artifact={artifact} submitted={submitted} />
          <CompletionPanel mission={mission} reflection={reflection} completed={completed} submitted={submitted} />
        </>
      ) : null}
    </div>
  );
}

/* ── 1. The deliverable ──────────────────────────────────────────────────── */

function DeliverableForm({
  mission,
  projectId,
  artifact,
}: {
  mission: MissionRow;
  projectId: string;
  artifact: ArtifactRow | null;
}) {
  const [state, formAction] = useActionState(saveArtifact, emptyWorkspaceState);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="missionId" value={mission.id} />
        <input type="hidden" name="missionSlug" value={mission.slug} />
        {artifact ? <input type="hidden" name="artifactId" value={artifact.id} /> : null}

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Label>Your work</Label>
          {artifact ? (
            <Badge tone={artifact.status === "draft" ? "quiet" : "accent"}>
              {ARTIFACT_STATUS_LABEL[artifact.status]}
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-ink-muted">{mission.deliverable_description}</p>

        <Field label="Title" htmlFor="artifact-title">
          <Input
            id="artifact-title"
            name="title"
            required
            maxLength={160}
            defaultValue={artifact?.title ?? mission.deliverable_title}
          />
        </Field>

        <div className="space-y-1.5">
          <label htmlFor="artifact-content" className="block text-sm font-medium text-ink">
            {mission.deliverable_title}
          </label>
          <textarea
            id="artifact-content"
            name="content"
            rows={14}
            maxLength={100000}
            defaultValue={artifact?.content ?? ""}
            placeholder="Write it here. This is the document, not a summary of it."
            className="w-full rounded-control bg-surface px-3.5 py-3 font-mono text-[0.8125rem] leading-relaxed text-ink ring-1 ring-border-strong transition-shadow placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </div>

        <Field
          label="Link"
          htmlFor="artifact-url"
          hint="Optional. Where the work lives, if it lives somewhere else."
        >
          <Input
            id="artifact-url"
            name="url"
            type="url"
            defaultValue={artifact?.url ?? ""}
            placeholder="https://"
          />
        </Field>

        <Row state={state} label="Save work" />
      </form>
    </Card>
  );
}

/* ── 2. Evidence ─────────────────────────────────────────────────────────── */

function EvidencePanel({
  mission,
  artifact,
  evidence,
}: {
  mission: MissionRow;
  artifact: ArtifactRow;
  evidence: EvidenceRow[];
}) {
  const [state, formAction] = useActionState(addEvidence, emptyWorkspaceState);
  const [removeState, removeAction] = useActionState(removeEvidence, emptyWorkspaceState);

  const required = mission.required_evidence ?? [];
  const attached = new Set(evidence.map((row) => row.kind));

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-2">
        <Label>Evidence</Label>
        <p className="text-sm text-ink-muted">
          {required.length > 0
            ? "This mission asks you to prove the work exists, not to say it does."
            : "Optional here. Later phases will insist on it."}
        </p>
      </div>

      {required.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {required.map((kind) => (
            <li key={kind}>
              <span
                className={cn(
                  "label inline-flex items-center gap-2 rounded-full border px-2.5 py-1",
                  attached.has(kind)
                    ? "border-success/40 text-success"
                    : "border-border text-ink-subtle",
                )}
              >
                {attached.has(kind) ? "✓" : "○"} {EVIDENCE_KIND_LABEL[kind]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {evidence.length > 0 ? (
        <ul className="space-y-2">
          {evidence.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-3 rounded-control border border-border p-3"
            >
              <div className="min-w-0">
                <span className="label mr-2 text-ink-subtle">{EVIDENCE_KIND_LABEL[row.kind]}</span>
                {row.url ? (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm break-all text-ink underline decoration-border-strong underline-offset-4"
                  >
                    {row.label || row.url}
                  </a>
                ) : (
                  <span className="text-sm text-ink-muted">{row.note}</span>
                )}
              </div>
              <form action={removeAction}>
                <input type="hidden" name="evidenceId" value={row.id} />
                <input type="hidden" name="missionSlug" value={mission.slug} />
                <button
                  type="submit"
                  className="min-h-11 text-sm text-ink-subtle underline decoration-border-strong underline-offset-4 hover:text-danger"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {removeState.error ? (
        <p role="alert" className="text-sm text-danger">{removeState.error}</p>
      ) : null}

      <form action={formAction} className="space-y-4 border-t border-border pt-4">
        <input type="hidden" name="artifactId" value={artifact.id} />
        <input type="hidden" name="missionSlug" value={mission.slug} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="evidence-kind" className="block text-sm font-medium text-ink">
              Kind
            </label>
            <select
              id="evidence-kind"
              name="kind"
              defaultValue={required[0] ?? "url"}
              className="h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-ink"
            >
              {(Object.keys(EVIDENCE_KIND_LABEL) as EvidenceKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {EVIDENCE_KIND_LABEL[kind]}
                </option>
              ))}
            </select>
            <p className="text-sm text-ink-subtle">{EVIDENCE_KIND_HINT[required[0] ?? "url"]}</p>
          </div>

          <Field label="Label" htmlFor="evidence-label" hint="Optional.">
            <Input id="evidence-label" name="label" maxLength={100} placeholder="Production" />
          </Field>
        </div>

        <Field label="URL" htmlFor="evidence-url" hint="Required for everything except a written note.">
          <Input id="evidence-url" name="url" type="url" placeholder="https://" />
        </Field>

        <div className="space-y-1.5">
          <label htmlFor="evidence-note" className="block text-sm font-medium text-ink">
            Written note
          </label>
          <textarea
            id="evidence-note"
            name="note"
            rows={3}
            className="w-full rounded-control bg-surface px-3.5 py-3 text-sm text-ink ring-1 ring-border-strong focus:ring-2 focus:ring-accent focus:outline-none"
            placeholder="Only for the Written note kind, where a link would not exist."
          />
        </div>

        <Row state={state} label="Attach evidence" variant="secondary" />
      </form>
    </Card>
  );
}

/* ── 3. Submit ───────────────────────────────────────────────────────────── */

function SubmitPanel({
  mission,
  artifact,
  submitted,
}: {
  mission: MissionRow;
  artifact: ArtifactRow;
  submitted: boolean;
}) {
  const [state, formAction] = useActionState(submitArtifact, emptyWorkspaceState);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="artifactId" value={artifact.id} />
        <input type="hidden" name="missionSlug" value={mission.slug} />

        <Label>Submit</Label>
        <p className="text-sm text-ink-muted">
          {submitted
            ? "Submitted. You can keep editing — resubmit if it changes materially."
            : "Sends the deliverable for review and records it in your build log."}
        </p>

        <Row state={state} label={submitted ? "Resubmit" : "Submit deliverable"} variant="secondary" />
      </form>
    </Card>
  );
}

/* ── 4. Complete ─────────────────────────────────────────────────────────── */

function CompletionPanel({
  mission,
  reflection,
  completed,
  submitted,
}: {
  mission: MissionRow;
  reflection: string;
  completed: boolean;
  submitted: boolean;
}) {
  const [state, formAction] = useActionState(completeMission, emptyWorkspaceState);

  if (completed) {
    return (
      <Card className="flex items-center gap-2 p-5">
        <span aria-hidden className="size-2 rounded-full bg-success" />
        <p className="text-sm text-ink">Mission complete.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="missionId" value={mission.id} />
        <input type="hidden" name="missionSlug" value={mission.slug} />

        <Label>Finish</Label>

        {mission.requires_reflection ? (
          <div className="space-y-1.5">
            <label htmlFor="mission-reflection" className="block text-sm font-medium text-ink">
              What did doing this change about how you see it?
            </label>
            <p className="text-sm text-ink-subtle">
              Required. The reasoning behind a decision outlasts the decision.
            </p>
            <textarea
              id="mission-reflection"
              name="reflection"
              rows={4}
              defaultValue={reflection}
              className="w-full rounded-control bg-surface px-3.5 py-3 text-[0.9375rem] text-ink ring-1 ring-border-strong focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>
        ) : null}

        <p className="text-sm text-ink-muted">
          {submitted
            ? "The deliverable is in. Close the mission when you are satisfied with it."
            : "Submit the deliverable first."}
        </p>

        <Row state={state} label="Complete mission" />
      </form>
    </Card>
  );
}

/* ── The submit row every form shares ────────────────────────────────────── */

function Row({
  state,
  label,
  variant = "primary",
}: {
  state: { error: string | null; message?: string | null };
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Pending label={label} variant={variant} />
      {state.message ? (
        <span role="status" className="text-sm text-success">{state.message}</span>
      ) : null}
      {state.error ? (
        <span role="alert" className="text-sm text-danger">{state.error}</span>
      ) : null}
    </div>
  );
}

function Pending({ label, variant }: { label: string; variant: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending} aria-busy={pending || undefined}>
      {pending ? <Spinner /> : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}
