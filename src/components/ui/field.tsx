import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A labelled input with room for an error.
 *
 * The error is wired to the input with `aria-describedby` and `aria-invalid`,
 * and announced with `role="alert"`, so a screen reader hears why a submission
 * failed rather than just landing on a red border.
 */

export function Input({
  className,
  invalid,
  ...props
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-control bg-surface px-3.5 text-[0.9375rem] text-ink",
        "ring-1 ring-border-strong transition-shadow",
        "placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-none",
        invalid && "ring-danger focus:ring-danger",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
