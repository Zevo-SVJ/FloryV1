"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateDisplayName } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/auth/form-state";

/**
 * Rename yourself.
 *
 * The only write Foundation ships, and it is here to prove the whole path works
 * end to end: a form, a Server Action, a session-derived owner, a column the
 * caller is allowed to write, and a row Row Level Security agrees is theirs.
 * Every write in LOCK takes this same route.
 *
 * The field is not `required`: clearing it is a legitimate edit, and the action
 * stores null rather than an empty string.
 */
export function DisplayNameForm({ current }: { current: string | null }) {
  const [state, formAction] = useActionState(updateDisplayName, emptyFormState);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Name"
        htmlFor="account-display-name"
        error={state.fieldErrors?.displayName}
        hint="How you are addressed in the interface. Leave empty to remove it."
      >
        <Input
          id="account-display-name"
          name="displayName"
          type="text"
          maxLength={80}
          defaultValue={current ?? ""}
          invalid={Boolean(state.fieldErrors?.displayName)}
          aria-describedby={
            state.fieldErrors?.displayName
              ? "account-display-name-error"
              : "account-display-name-hint"
          }
        />
      </Field>

      <div className="flex items-center gap-3">
        <Save />
        {state.message ? (
          <p role="status" className="text-sm text-success">
            {state.message}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}
