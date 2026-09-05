"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, Label } from "@/components/ui/surface";
import { askMentor } from "@/lib/mentor/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";

/**
 * Ask your mentor.
 *
 * Attached to the work rather than floating in a chat window — a question with
 * a mission behind it can be answered by somebody looking at the same thing.
 * Asynchronous by design: no presence, no typing indicator, nothing that
 * rewards being fast over being useful.
 */
export function AskMentorForm({
  projectId,
  missionId,
  artifactId,
}: {
  projectId?: string | null;
  missionId?: string | null;
  artifactId?: string | null;
}) {
  const [state, formAction] = useActionState(askMentor, emptyWorkspaceState);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-3">
        {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
        {missionId ? <input type="hidden" name="missionId" value={missionId} /> : null}
        {artifactId ? <input type="hidden" name="artifactId" value={artifactId} /> : null}

        <Label>Ask your mentor</Label>
        <p className="text-sm text-ink-subtle">
          Say what you tried and where you got stuck. A question with your
          reasoning in it gets an answer that improves the reasoning.
        </p>

        <textarea
          name="question"
          rows={4}
          maxLength={4000}
          placeholder="I have six conversations saying the problem is real, but nobody has switched tools over it. Is that enough to start building?"
          className="w-full rounded-control bg-surface px-3.5 py-3 text-[0.9375rem] text-ink ring-1 ring-border-strong focus:ring-2 focus:ring-accent focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Send />
          {state.message ? (
            <span role="status" className="text-sm text-success">{state.message}</span>
          ) : null}
          {state.error ? (
            <span role="alert" className="text-sm text-danger">{state.error}</span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function Send() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Sending…" : "Send question"}
    </Button>
  );
}
