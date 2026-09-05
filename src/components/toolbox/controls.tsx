"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { recordItemView, setChecklistState, toggleSaved } from "@/lib/toolbox/actions";
import { emptyWorkspaceState } from "@/lib/workspace/action-state";
import type { ChecklistBody } from "@/lib/toolbox/schemas";

/**
 * The interactive parts of the Toolbox.
 *
 * Three of them, and each is small on purpose: the library's job is to get out
 * of the way between deciding to use something and using it.
 */

/**
 * Copy the prompt.
 *
 * `navigator.clipboard` needs a secure context and a user gesture, and it
 * rejects in an iframe without permission — so the failure path is real, not
 * theoretical, and it says so rather than silently doing nothing. The
 * confirmation clears itself after two seconds because a button stuck on
 * "Copied" makes the next copy feel like it failed.
 */
export function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("copied");
          } catch {
            setState("failed");
          }
        }}
      >
        {state === "copied" ? "Copied" : label}
      </Button>

      <span role="status" aria-live="polite" className="label text-ink-subtle">
        {state === "copied" ? "On your clipboard" : null}
        {state === "failed" ? "Your browser blocked the copy — select the text instead" : null}
      </span>
    </div>
  );
}

/** Save, or unsave. One button, because it is one decision. */
export function SaveButton({
  itemId,
  saved,
  path,
}: {
  itemId: string;
  saved: boolean;
  path?: string;
}) {
  const [state, formAction] = useActionState(toggleSaved, emptyWorkspaceState);

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="saved" value={String(saved)} />
      {path ? <input type="hidden" name="path" value={path} /> : null}
      <SaveSubmit saved={saved} error={state.error} />
    </form>
  );
}

function SaveSubmit({ saved, error }: { saved: boolean; error: string | null }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        aria-pressed={saved}
        className={cn(
          "min-h-11 rounded-control border px-3 text-sm transition-colors",
          saved
            ? "border-accent bg-accent-quiet text-ink"
            : "border-border text-ink-muted hover:bg-surface-sunken hover:text-ink",
          pending && "opacity-60",
        )}
      >
        {saved ? "Saved" : "Save"}
      </button>
      {error ? (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Records that this item was opened.
 *
 * Renders nothing. It exists so the write happens after the page is on screen
 * rather than during the render — a read that writes fires on prefetches and
 * previews, and "recently used" would become a list of pages the browser
 * guessed at.
 */
export function RecordView({ itemId }: { itemId: string }) {
  useEffect(() => {
    void recordItemView(itemId);
  }, [itemId]);

  return null;
}

/**
 * A checklist the learner can tick.
 *
 * Native checkboxes in a form that posts the whole set. Optimistic ticking is
 * deliberately absent: a checklist is consulted slowly, and a box that appears
 * ticked before the write lands is a box that can lie after a failed request.
 */
export function ChecklistControl({
  itemId,
  body,
  checkedIds,
  path,
}: {
  itemId: string;
  body: ChecklistBody;
  checkedIds: string[];
  path?: string;
}) {
  const [state, formAction] = useActionState(setChecklistState, emptyWorkspaceState);
  const checked = new Set(checkedIds);

  const total = body.groups.reduce((sum, group) => sum + group.items.length, 0);
  const done = body.groups.reduce(
    (sum, group) => sum + group.items.filter((item) => checked.has(item.id)).length,
    0,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="itemId" value={itemId} />
      {path ? <input type="hidden" name="path" value={path} /> : null}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="label text-ink-subtle">
          {done} of {total} checked
        </p>
        <p className="text-sm text-ink-subtle">
          A checklist is a safety tool, not evidence.
        </p>
      </div>

      {body.groups.map((group) => (
        <fieldset key={group.title} className="space-y-2">
          <legend className="label mb-2 text-ink-subtle">{group.title}</legend>

          {group.items.map((item) => (
            <label
              key={item.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control px-3 py-2 transition-colors hover:bg-surface-sunken"
            >
              <input
                type="checkbox"
                name="checked"
                value={item.id}
                defaultChecked={checked.has(item.id)}
                className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-[0.9375rem] text-ink">{item.label}</span>
                {item.detail ? (
                  <span className="mt-0.5 block text-sm text-ink-subtle">{item.detail}</span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <ChecklistSubmit />
        <button
          type="submit"
          name="reset"
          value="true"
          className="min-h-11 text-sm text-ink-subtle underline decoration-border-strong underline-offset-4 hover:text-ink"
        >
          Reset
        </button>
        {state.message ? (
          <span role="status" className="text-sm text-success">
            {state.message}
          </span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-sm text-danger">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function ChecklistSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save progress"}
    </Button>
  );
}
