"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";
import { addBuildLogEntry } from "@/lib/workspace/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";

/**
 * One line, and an optional second.
 *
 * Deliberately the smallest form in the product. A build log entry competes
 * with actually building, and any field beyond "what happened" is a reason not
 * to write it.
 */
export function BuildLogForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(addBuildLogEntry, emptyWorkspaceState);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="projectId" value={projectId} />

        <Field label="What happened?" htmlFor="log-title">
          <Input
            id="log-title"
            name="title"
            required
            maxLength={200}
            placeholder="First user said the pricing was the problem"
          />
        </Field>

        <Field label="Detail" htmlFor="log-detail" hint="Optional. Why it mattered.">
          <Input id="log-detail" name="detail" maxLength={500} />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Add />
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

function Add() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Add entry"}
    </Button>
  );
}
