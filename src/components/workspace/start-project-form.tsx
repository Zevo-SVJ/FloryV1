"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { createProject } from "@/lib/workspace/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";

/**
 * The one gate before the workspace exists.
 *
 * Two fields, both changeable later, and it says so — because the honest state
 * at this point is that the learner does not know what they are building yet,
 * and a form that demands a polished description would be asking for a lie.
 * Naming the thing is the point; the naming is what makes it real.
 */
export function StartProjectForm() {
  const [state, formAction] = useActionState(createProject, emptyWorkspaceState);

  return (
    <form action={formAction} className="max-w-measure space-y-5">
      {state.error ? (
        <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Field
        label="What are you building?"
        htmlFor="project-name"
        hint="A working name is fine. You will almost certainly change it."
      >
        <Input id="project-name" name="name" required maxLength={100} placeholder="Ledgerly" />
      </Field>

      <Field
        label="In one line"
        htmlFor="project-description"
        hint="Optional now. The early missions are what turn this into something defensible."
      >
        <Input
          id="project-description"
          name="description"
          maxLength={280}
          placeholder="Invoice reconciliation for agencies."
        />
      </Field>

      <Start />
    </form>
  );
}

function Start() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <Spinner /> : null}
      {pending ? "Creating…" : "Start my SaaS"}
    </Button>
  );
}
