"use client";

import { useActionState } from "react";
import { Card, Label } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { awardMilestone } from "@/lib/progress/actions";
import type { WorkspaceState } from "@/lib/workspace/action-state";

const INITIAL: WorkspaceState = { error: null };

/**
 * A mentor confirming something the database cannot see.
 *
 * Only the milestones whose requirement is `manual` are offered, and they are
 * passed in already filtered by the server — a select listing every milestone
 * would invite a mentor to hand-award one the evaluator is meant to decide,
 * and `award_milestone()` would accept it. Narrowing the choice here is the
 * interface agreeing with the intent rather than testing the boundary.
 *
 * The options arrive as plain strings. Anything handed to a Client Component
 * is serialized into the page, so this receives the two fields it draws and
 * not the milestone rows they came from.
 */
export function AwardMilestoneForm({
  learnerId,
  options,
}: {
  learnerId: string;
  options: readonly { key: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(awardMilestone, INITIAL);

  if (options.length === 0) return null;

  return (
    <section className="max-w-measure space-y-3">
      <Label>Confirm a milestone</Label>
      <Card className="p-5">
        <form action={action} className="space-y-4">
          <input type="hidden" name="learnerId" value={learnerId} />

          <p className="text-sm text-ink-muted">
            LOCK has no analytics and no billing integration, so it cannot see a
            real user or a real payment. These are the ones a person has to
            confirm.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="milestoneKey" className="label text-ink-subtle">
              Milestone
            </label>
            <select
              id="milestoneKey"
              name="milestoneKey"
              required
              defaultValue=""
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="" disabled>
                Choose one
              </option>
              {options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.title}
                </option>
              ))}
            </select>
          </div>

          <Field label="What you saw" htmlFor="note">
            <Input
              id="note"
              name="note"
              placeholder="The signup email, the payment, the thing you actually looked at."
            />
          </Field>

          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {state.message ? (
            <p role="status" className="text-sm text-ink-muted">
              {state.message}
            </p>
          ) : null}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Awarding…" : "Award it"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
