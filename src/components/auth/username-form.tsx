"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { UsernameField } from "@/components/auth/username-field";
import { claimUsername } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/auth/form-state";

/**
 * Claiming a username on its own, for an account that arrived without one.
 *
 * The same field as signup, so the rules and the preview cannot drift apart.
 */
export function UsernameForm() {
  const [state, formAction, pending] = useActionState(claimUsername, emptyFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <UsernameField serverError={state.fieldErrors?.username} />

      {state.error && !state.fieldErrors?.username ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Claiming…" : "Claim it"}
      </Button>
    </form>
  );
}
