"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Notice } from "@/components/auth/notice";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { emptyFormState, type FormState } from "@/lib/auth/form-state";

/**
 * Email and password.
 *
 * One component for signing in and creating an account, because they differ by
 * one field and a verb, and two near-identical forms drift apart the first time
 * somebody fixes a bug in only one of them.
 *
 * Expected failures arrive as returned state, not thrown exceptions, so a
 * mistyped password re-renders the form with a sentence beside the field that
 * caused it rather than replacing the page with an error boundary. What the
 * person already typed survives, because the form is never remounted.
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

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.message ? <Notice tone="success">{state.message}</Notice> : null}

      {signUp ? (
        <Field
          label="Name"
          htmlFor="displayName"
          error={state.fieldErrors?.displayName}
          hint="Optional."
        >
          <Input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            maxLength={80}
            placeholder="How you are addressed"
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
          placeholder="you@example.com"
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
          placeholder={signUp ? "At least 10 characters" : "••••••••••"}
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

      <Submit idle={signUp ? "Create account" : "Sign in"} busy={signUp ? "Creating account…" : "Signing in…"} />
    </form>
  );
}

/**
 * Its own component because `useFormStatus` reads the state of the form it is
 * rendered *inside*. Called from the form's own body it would always be idle.
 */
function Submit({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <Spinner /> : null}
      {pending ? busy : idle}
    </Button>
  );
}
