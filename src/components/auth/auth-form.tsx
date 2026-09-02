"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { emptyFormState, type FormState } from "@/lib/auth/form-state";

/**
 * The one auth form, in both moods.
 *
 * A Client Component only because it needs `useActionState` to render the
 * error the server sent back and to disable the button while the action is in
 * flight. Everything it submits is validated again on the server.
 */

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "sign-in" | "sign-up";
  action: Action;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const signingUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint={signingUp ? "At least 10 characters." : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
          invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={
            state.fieldErrors?.password
              ? "password-error"
              : signingUp
                ? "password-hint"
                : undefined
          }
        />
      </Field>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? signingUp
            ? "Creating account…"
            : "Signing in…"
          : signingUp
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        {signingUp ? "Already have an account? " : "New to ShowMe? "}
        <Link
          href={signingUp ? "/login" : "/signup"}
          className="font-medium text-ink underline underline-offset-4"
        >
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
