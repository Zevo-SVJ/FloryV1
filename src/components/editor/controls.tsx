"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { uploadImage, deleteImage } from "@/lib/editor/actions";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES, UPLOAD_MESSAGES } from "@/lib/media/constraints";
import { cn } from "@/lib/utils/cn";

/**
 * The editor's own small controls.
 *
 * Separate from `components/ui`, which is the product's shared vocabulary. An
 * editor field is a denser thing than a login field — it sits in a stack of
 * twenty, it labels itself quietly, and it is never the only thing on screen.
 * Mixing the two would push editor concerns into the sign-up form.
 *
 * Everything here is a Client Component and none of it is reachable from the
 * public page's import graph.
 */

/* ── Text ─────────────────────────────────────────────────────────────────── */

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string | null;
  maxLength?: number;
  /** Shows a live count. Only worth it where the limit is easy to hit. */
  counter?: boolean;
  /**
   * Checked when the field is left, and never while it is being typed.
   *
   * Somebody halfway through a URL has not made a mistake yet, and a field
   * that turns red on the second character is a field people learn to ignore.
   * Returns the message to show, or null when the value is fine; the field
   * holds that message itself so callers do not each need a piece of state.
   */
  onBlurValidate?: (value: string) => string | null;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  maxLength,
  counter,
  onBlurValidate,
}: FieldProps) {
  const id = useId();
  const [blurError, setBlurError] = useState<string | null>(null);

  // An error passed in — from a failed save, say — outranks one this field
  // found on its own, because it is the more recent news.
  const shown = error ?? blurError;

  return (
    <div>
      <Label htmlFor={id} label={label} maxLength={maxLength} counter={counter} value={value} />
      <input
        id={id}
        value={value}
        onChange={(event) => {
          if (blurError) setBlurError(null);
          onChange(event.target.value);
        }}
        onBlur={
          onBlurValidate ? () => setBlurError(onBlurValidate(value.trim())) : undefined
        }
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={shown ? true : undefined}
        aria-describedby={shown || hint ? `${id}-note` : undefined}
        className={inputClasses(Boolean(shown))}
      />
      <Note id={`${id}-note`} error={shown} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  maxLength,
  counter,
  rows = 3,
}: FieldProps & { rows?: number }) {
  const id = useId();

  return (
    <div>
      <Label htmlFor={id} label={label} maxLength={maxLength} counter={counter} value={value} />
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={cn(inputClasses(Boolean(error)), "h-auto resize-y py-2.5 leading-relaxed")}
      />
      <Note id={`${id}-note`} error={error} hint={hint} />
    </div>
  );
}

const inputClasses = (invalid: boolean) =>
  cn(
    "h-10 w-full rounded-control bg-surface px-3 text-[0.9375rem] text-ink",
    "ring-1 ring-border-strong transition-shadow",
    "placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-none",
    invalid && "ring-danger focus:ring-danger",
  );

function Label({
  htmlFor,
  label,
  maxLength,
  counter,
  value,
}: {
  htmlFor: string;
  label: string;
  maxLength?: number;
  counter?: boolean;
  value: string;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      {counter && maxLength ? (
        <span
          className={cn(
            "font-mono text-[0.6875rem] tabular-nums",
            value.length > maxLength * 0.9 ? "text-ink-muted" : "text-ink-subtle",
          )}
        >
          {value.length}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}

function Note({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
        {error}
      </p>
    );
  }
  if (!hint) return null;
  return (
    <p id={id} className="mt-1.5 text-[0.8125rem] text-ink-subtle">
      {hint}
    </p>
  );
}

/* ── Choice ───────────────────────────────────────────────────────────────── */

/**
 * A small set of options, as buttons rather than a dropdown.
 *
 * Alignment and aspect ratio are two or three choices each, and a select
 * element hides two of them behind a tap. Radios in a row show the whole
 * decision at once, which is what a settings panel should do.
 */
export function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.8125rem] font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "h-8 rounded-control px-3 text-[0.8125rem] font-medium transition-colors",
                active
                  ? "bg-ink text-canvas"
                  : "bg-surface-sunken text-ink-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(inputClasses(false), "cursor-pointer pr-8")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Visibility ───────────────────────────────────────────────────────────── */

/**
 * Published or hidden.
 *
 * A real checkbox underneath, so it is reachable by keyboard and announced as
 * a switch, with the visual switch drawn on top. `sr-only` rather than
 * `display: none` — a hidden input is not focusable, and this one has to be.
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2",
          checked ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}

/* ── Dates and times ──────────────────────────────────────────────────────── */

/**
 * A moment, entered in the creator's own time zone.
 *
 * `<input type="datetime-local">` is the whole control: the platform supplies
 * a calendar, a keyboard-accessible text form, and the visitor's own locale
 * for the order of day and month. A hand-built date picker would be a
 * fortnight of work to arrive somewhere worse, and worse in the specific way
 * that matters here — a creator scheduling a drop needs to be certain what
 * time they typed.
 *
 * The value on the wire is an absolute instant; the value in the field is
 * local wall-clock time. `toLocalInput` and `fromLocalInput` are the two ends
 * of that conversion and they are tested against each other, because a field
 * labelled with one zone showing a time from another is the classic way this
 * feature ships broken.
 *
 * `step` is a minute. Seconds in a schedule are a false precision, and asking
 * a browser for them adds a spinner nobody wants.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  hint,
  error,
  min,
}: {
  label: string;
  /** Local wall-clock text: `YYYY-MM-DDTHH:mm`, or empty. */
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string | null;
  min?: string;
}) {
  const id = useId();

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
          {label}
        </label>
        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded text-[0.75rem] text-ink-subtle transition-colors hover:text-danger"
          >
            Clear
          </button>
        ) : null}
      </div>

      <input
        id={id}
        type="datetime-local"
        step={60}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={cn(inputClasses(Boolean(error)), "text-[0.875rem]")}
      />
      <Note id={`${id}-note`} error={error} hint={hint} />
    </div>
  );
}

/* ── Images ───────────────────────────────────────────────────────────────── */

/**
 * Pick an image, and see it immediately.
 *
 * Uploads run as the file is chosen rather than waiting for Save. A `File`
 * cannot survive a page reload in React state, and a creator who picked four
 * gallery images should not lose them to a stray refresh — so the bytes go up
 * now and the URL travels in the draft like any other string.
 *
 * The size check here is a courtesy that saves a doomed round trip on a phone.
 * The upload action checks again, and Storage checks a third time; this one is
 * the only one a determined client can skip.
 */
export function ImagePicker({
  url,
  onChange,
  label,
  shape = "wide",
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  label: string;
  shape?: "wide" | "square" | "circle";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(UPLOAD_MESSAGES.too_large);
      return;
    }

    setError(null);
    setBusy(true);

    const body = new FormData();
    body.set("file", file);
    const result = await uploadImage(body);

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    /*
     * The previous image is removed only after the new one is safely stored.
     * Doing it the other way round means a failed upload leaves the creator
     * with nothing, having had something a moment ago.
     */
    const previous = url;
    onChange(result.url);
    if (previous) void deleteImage(previous);
  }

  const frame =
    shape === "circle"
      ? "h-20 w-20 rounded-full"
      : shape === "square"
        ? "h-20 w-20 rounded-card"
        : "h-24 w-full rounded-card";

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-surface-sunken ring-1 ring-border",
            frame,
          )}
        >
          {url ? (
            <Image src={url} alt="" fill sizes="160px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[0.6875rem] text-ink-subtle">
              {busy ? "Uploading…" : "No image"}
            </span>
          )}
          {url && busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-canvas/70 text-[0.6875rem] text-ink-muted">
              Uploading…
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <input
            ref={input}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              // Cleared so choosing the same file twice fires a change again.
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="h-8 rounded-control bg-surface px-3 text-[0.8125rem] font-medium ring-1 ring-border-strong transition-colors hover:bg-surface-sunken disabled:opacity-50"
          >
            {url ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </button>
          {url ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const previous = url;
                onChange(null);
                void deleteImage(previous);
              }}
              className="h-8 rounded-control px-3 text-left text-[0.8125rem] text-ink-subtle transition-colors hover:text-danger disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Rows ─────────────────────────────────────────────────────────────────── */

/** The small round icon buttons that sit on every editable row. */
export function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors",
        "hover:bg-surface-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30",
        danger && "hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}

export function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("h-4 w-4", className)}
    >
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  up: "M12 19V5M5 12l7-7 7 7",
  down: "M12 5v14M19 12l-7 7-7-7",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  plus: "M12 5v14M5 12h14",
  chevron: "M6 9l6 6 6-6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 15a3 3 0 100-6 3 3 0 000 6Z",
  eyeOff: "M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.2A9.6 9.6 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.3 6.4A17 17 0 002 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
} as const;
