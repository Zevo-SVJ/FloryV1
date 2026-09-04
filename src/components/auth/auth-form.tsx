"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { emptyFormState, type FormState } from "@/lib/auth/form-state";

/**
 * The sign-in and sign-up form.
 *
 * One component for both, because they differ by one field and a verb, and two
 * near-identical forms drift apart the first time somebody fixes a bug in only
 * one of them.
 *
 * Errors arrive as returned state rather than as thrown exceptions, so a
 * failure re-renders the form with a sentence next to the field that caused it
 * instead of replacing the page with a boundary. The values the person already
 * typed survive, because the form is not remounted.
 */

type Mode = "sign-in" | "sign-up";

export function AuthForm({
  mode,
  action,
  /** Where to return after signing in. Already validated on the server. */
  next,
}: {
  mode: Mode;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, emptyFormState);
  const signUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-danger/40 bg-surface px-3.5 py-3 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className="rounded-control border border-border bg-surface px-3.5 py-3 text-sm text-ink-muted"
        >
          {state.message}
        </p>
      ) : null}

      {signUp ? (
        <Field
          label="Name"
          htmlFor="displayName"
          error={state.fieldErrors?.displayName}
          hint="Optional. How you are addressed in the interface."
        >
          <Input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            maxLength={80}
            invalid={Boolean(state.fieldErrors?.displayName)}
            aria-describedby={
              state.fieldErrors?.displayName ? "displayName-error" : "displayName-hint"
            }
          />
        </Field>
      ) : null}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus={!signUp}
          invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint={signUp ? "At least 10 characters." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={signUp ? "new-password" : "current-password"}
          invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={
            state.fieldErrors?.password
              ? "password-error"
              : signUp
                ? "password-hint"
                : undefined
          }
        />
      </Field>

      <Submit label={signUp ? "Create account" : "Sign in"} />
    </form>
  );
}

/**
 * Its own component because `useFormStatus` reads the state of the form it is
 * rendered *inside*. Called from the form's own body it would always report
 * idle.
 */
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}
