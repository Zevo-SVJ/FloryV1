import { Card, Badge } from "@/components/ui/surface";
import { cn } from "@/lib/utils/cn";
import type { LearnerMilestoneRow, MilestoneRow } from "@/types/database";

/**
 * A milestone or an achievement, earned or not.
 *
 * Both states are drawn, and the unearned one is not hidden: a page showing
 * only what somebody already has tells them nothing about what the program is
 * asking of them next. An unearned award is dimmed and keeps its description,
 * which turns the page into a map rather than a trophy shelf.
 *
 * The glyph is a character in the interface's own type rather than an
 * illustration. That is what keeps this from reading as a game — LOCK's visual
 * language is typographic, and a sprite would fight everything around it.
 */
export function AwardCard({
  award,
  earned,
}: {
  award: MilestoneRow;
  earned: LearnerMilestoneRow | undefined;
}) {
  const has = earned !== undefined;

  return (
    <Card
      className={cn(
        "flex gap-4 p-5",
        has ? "bg-surface" : "border-dashed bg-transparent",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm",
          has ? "bg-accent-quiet text-accent" : "bg-surface-sunken text-ink-subtle",
        )}
      >
        {award.icon}
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3
            className={cn(
              "text-[0.9375rem] font-medium",
              has ? "text-ink" : "text-ink-muted",
            )}
          >
            {award.title}
          </h3>
          {has ? (
            <span className="label text-accent">Earned</span>
          ) : award.requirement === "manual" ? (
            /* Said plainly rather than left to look like a bug. LOCK cannot see
               a real customer, so a person confirms these. */
            <span className="label text-ink-subtle">Mentor confirms</span>
          ) : null}
        </div>

        <p className="text-sm text-ink-muted">{award.summary}</p>

        {has ? (
          <>
            <p className="text-sm text-ink-subtle">{award.description}</p>
            <p className="label pt-1 text-ink-subtle tabular-nums">
              {formatDate(earned.earned_at)}
              {earned.note ? ` · ${earned.note}` : ""}
            </p>
          </>
        ) : null}
      </div>
    </Card>
  );
}

/** The one-line form, for the dashboard's recent wins. */
export function AwardLine({
  award,
  earnedAt,
}: {
  award: MilestoneRow;
  earnedAt: string;
}) {
  return (
    <li className="flex gap-3 py-2">
      <span aria-hidden className="text-sm text-accent">
        {award.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm text-ink">{award.title}</span>
        <span className="label ml-3 text-ink-subtle tabular-nums">
          {formatDate(earnedAt)}
        </span>
      </span>
    </li>
  );
}

export function AwardCount({ earned, total }: { earned: number; total: number }) {
  return (
    <Badge tone={earned > 0 ? "accent" : "quiet"}>
      {earned} of {total}
    </Badge>
  );
}

/*
 * A fixed locale and time zone, everywhere a date is printed.
 *
 * The server and the browser must format a date identically or React reports a
 * hydration mismatch — and "today" is genuinely a different day in two places
 * at once. The dashboard has done it this way since Prompt 2.
 */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
