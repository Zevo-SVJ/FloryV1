"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { createProject } from "@/lib/workspace/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";

/**
 * Naming the product.
 *
 * A setup step, not a profile form. Two fields, both changeable later, and the
 * page around it carries the explanation so the form itself can be almost
 * wordless — the fastest way to make something feel like a product decision
 * rather than a school assignment is to stop explaining it.
 *
 * The error is rendered above the fields and announced. It never contains a
 * database error: `createProject` logs the real fault server-side and returns a
 * sentence, plus the detail in development only. `whitespace-pre-line` is for
 * that development detail, which arrives on its own line.
 */
export function StartProjectForm() {
  const [state, formAction] = useActionState(createProject, emptyWorkspaceState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="max-w-measure rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-sm whitespace-pre-line text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="space-y-5">
        <Field
          label="Working name"
          htmlFor="project-name"
          hint="You will almost certainly change it."
        >
          <Input
            id="project-name"
            name="name"
            required
            maxLength={100}
            autoComplete="off"
            /* The first thing on an otherwise empty page should already be
               focused — there is exactly one thing to do here. */
            autoFocus
            placeholder="Ledgerly"
          />
        </Field>

        <Field label="In one line" htmlFor="project-description" hint="Optional.">
          <Input
            id="project-description"
            name="description"
            maxLength={280}
            autoComplete="off"
            placeholder="Invoice reconciliation for agencies."
          />
        </Field>
      </div>

      <Start />
    </form>
  );
}

/**
 * The button, and the double-submit guard.
 *
 * `useFormStatus` reports the pending state of the enclosing form, so the
 * button disables itself for the duration of the action. That is the whole
 * protection needed: a disabled submit cannot be clicked twice, and the action
 * is not reachable any other way from this page.
 */
function Start() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Spinner /> : null}
        {pending ? "Creating…" : "Create product"}
      </Button>
      {pending ? (
        <span role="status" className="text-sm text-ink-subtle">
          Setting up your workspace…
        </span>
      ) : null}
    </div>
  );
}
