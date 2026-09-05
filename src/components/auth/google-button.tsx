"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { GoogleMark } from "@/components/auth/google-mark";
import { Notice } from "@/components/auth/notice";
import { Spinner } from "@/components/ui/spinner";
import { signInWithGoogle } from "@/lib/auth/actions";
import { emptyFormState } from "@/lib/auth/form-state";

/**
 * Continue with Google.
 *
 * A form rather than a button with an `onClick`, and that is the whole design:
 * the action runs on the server, where the PKCE verifier can be written to a
 * cookie, and the page needs no Supabase client in the browser to start a
 * sign-in. It also means this works with JavaScript still loading.
 *
 * On success the action redirects and this component is gone. It only ever
 * renders its own error state when the redirect did not happen — the provider
 * is not enabled on the project, or Supabase refused.
 */
export function GoogleButton({ next, label }: { next?: string; label: string }) {
  const [state, formAction] = useActionState(signInWithGoogle, emptyFormState);

  return (
    <div className="space-y-3">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      <form action={formAction}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Submit label={label} />
      </form>
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={
        "flex h-11 w-full select-none items-center justify-center gap-2.5 rounded-control " +
        "bg-surface text-[0.9375rem] font-medium text-ink ring-1 ring-border-strong " +
        "shadow-control transition-colors hover:bg-surface-sunken " +
        "disabled:pointer-events-none disabled:opacity-60"
      }
    >
      {pending ? <Spinner /> : <GoogleMark className="size-[18px]" />}
      {pending ? "Opening Google…" : label}
    </button>
  );
}
