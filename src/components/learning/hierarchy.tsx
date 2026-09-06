import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { lessonTypeLabel } from "@/lib/learning/labels";
import type { LessonSummary } from "@/lib/learning/queries";
import type { PhaseState } from "@/lib/lock/roadmap";
import { PhaseMark, PHASE_STATE_WORD } from "@/components/learning/journey";

/**
 * Phase → Module → Lesson, each with a different visual job.
 *
 * The old interface drew all three as the same bordered card, so the hierarchy
 * existed in the data and nowhere on the screen. Here each level is a different
 * *kind* of thing:
 *
 *   Phase   a numbered band with a rule — structural, like a chapter
 *   Module  a titled block with its own outcome and counts
 *   Lesson  a dense row, never a card
 *
 * That is the whole idea: cards are reserved for things you act on, and the
 * skeleton of the curriculum is typography and dividers.
 */

/* ── Phase ────────────────────────────────────────────────────────────────── */

export function PhaseBand({
  number,
  label,
  summary,
  state,
  meta,
  children,
}: {
  number: number;
  label: string;
  summary: string;
  state: PhaseState;
  /** Counts, progress — whatever this surface wants on the right. */
  meta?: ReactNode;
  children?: ReactNode;
}) {
  const dim = state === "locked";

  return (
    <section className={cn("relative", dim && "opacity-70")}>
      <div className="flex gap-4">
        <PhaseMark state={state} />

        <div className="min-w-0 flex-1 pb-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="label tabular-nums text-ink-subtle">
              {String(number).padStart(2, "0")}
            </span>
            <h2
              className={cn(
                "text-[1.0625rem] leading-tight font-medium tracking-tight",
                dim ? "text-ink-muted" : "text-ink",
              )}
            >
              {label}
            </h2>
            <span
              className={cn(
                "label",
                state === "current" ? "text-accent" : "text-ink-subtle",
              )}
            >
              {PHASE_STATE_WORD[state]}
            </span>
          </div>

          <p className="mt-1 max-w-measure text-sm leading-relaxed text-ink-muted">{summary}</p>

          {meta ? <div className="mt-2">{meta}</div> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

/**
 * What a phase will teach, before it has been written.
 *
 * The old copy said "No modules published in this phase yet." nine times down
 * one page, which reads as nine failures. A phase that has not been written is
 * a normal state of a curriculum being built, so it says what the phase is for
 * and marks itself as in preparation — the structure of the journey stays
 * visible, which is the point of showing all ten.
 */
export function PhaseInPreparation({ summary }: { summary: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-l border-border pl-4 text-sm text-ink-subtle">
      <span className="label">In preparation</span>
      <span className="max-w-measure">{summary}</span>
    </p>
  );
}

/* ── Module ───────────────────────────────────────────────────────────────── */

export interface ModuleCounts {
  lessons: number;
  lessonsDone: number;
  missions: number;
  minutes: number;
}

/**
 * A module, as a unit of progression rather than a folder.
 *
 * Given a title, an outcome and its shape — how many lessons, whether it ends
 * in a mission, how long it takes. That last line is what turns "a folder of
 * lessons" into "a piece of work with a size".
 */
export function ModuleBlock({
  number,
  title,
  summary,
  counts,
  href,
  next,
}: {
  number: number;
  title: string;
  summary: string;
  counts: ModuleCounts;
  href: string;
  /**
   * The one module to open now. Exactly one per phase gets this, and it is the
   * only one that gets the accent — a tint on every module is a tint on none.
   */
  next?: boolean;
}) {
  const complete = counts.lessons > 0 && counts.lessonsDone === counts.lessons;
  /* "In progress" has to mean lessons were finished here. Deriving it from
     "has an unfinished lesson" made every untouched module claim progress. */
  const started = counts.lessonsDone > 0 && !complete;

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-card border p-5 transition-colors",
        next
          ? "border-accent/40 bg-accent-quiet/25 hover:border-accent/70"
          : "border-border hover:border-border-strong hover:bg-surface-sunken",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label tabular-nums text-ink-subtle">
          Module {String(number).padStart(2, "0")}
        </span>
        {complete ? (
          <span className="label text-ink-subtle">Complete</span>
        ) : started ? (
          <span className="label text-accent">In progress</span>
        ) : next ? (
          <span className="label text-accent">Start here</span>
        ) : (
          <span className="label text-ink-subtle">Not started</span>
        )}
      </div>

      <h3 className="mt-1.5 text-[1.0625rem] leading-snug font-medium tracking-tight text-ink">
        {title}
      </h3>
      {summary ? (
        <p className="mt-1 max-w-measure text-sm leading-relaxed text-ink-muted">{summary}</p>
      ) : null}

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <ModuleStat done={counts.lessonsDone} total={counts.lessons} unit="lessons" />
        {counts.missions > 0 ? (
          <span className="label text-ink-subtle tabular-nums">
            {counts.missions} {counts.missions === 1 ? "mission" : "missions"}
          </span>
        ) : null}
        {counts.minutes > 0 ? (
          <span className="label text-ink-subtle tabular-nums">~{counts.minutes} min</span>
        ) : null}
      </p>
    </Link>
  );
}

function ModuleStat({ done, total, unit }: { done: number; total: number; unit: string }) {
  return (
    <span className="label flex items-center gap-2 text-ink-subtle">
      <span className="tabular-nums">
        {done}/{total} {unit}
      </span>
      {/* A four-segment tick rather than a bar: at these sizes a bar reads as a
          percentage of something continuous, and a module is a handful of
          discrete steps. */}
      {total > 0 && total <= 8 ? (
        <span className="flex gap-0.5">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn("h-1 w-2.5 rounded-full", i < done ? "bg-accent" : "bg-border")}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

/* ── Lesson ───────────────────────────────────────────────────────────────── */

/**
 * A lesson as a row.
 *
 * Never a card. A curriculum is mostly lessons, and a card per lesson is what
 * turned the old page into a wall of identical rectangles. Rows on dividers
 * scan vertically, hold more per screen, and leave cards meaning something.
 *
 * The type is set in the mono label rather than a coloured badge — twelve
 * lesson types as twelve colours would be a legend nobody reads.
 */
export function LessonRow({
  lesson,
  done,
  revisit,
  next,
  index,
}: {
  lesson: LessonSummary;
  done: boolean;
  revisit?: boolean;
  /** The one to do now. Gets the accent and the only strong weight. */
  next?: boolean;
  index?: number;
}) {
  return (
    <li>
      <Link
        href={`/learn/lessons/${lesson.slug}`}
        className={cn(
          "group flex gap-4 py-3.5 transition-colors sm:gap-5",
          "hover:bg-surface-sunken -mx-3 rounded-control px-3",
        )}
      >
        <span className="pt-0.5">
          <LessonMark done={done} next={next} index={index} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span
              className={cn(
                "text-[0.9375rem] leading-snug",
                done ? "text-ink-muted" : "font-medium text-ink",
              )}
            >
              {lesson.title}
            </span>
            {next ? <span className="label text-accent">Next</span> : null}
            {revisit ? <span className="label text-ink-subtle">Revisit</span> : null}
          </span>

          {lesson.summary ? (
            <span className="mt-0.5 block max-w-measure text-sm leading-relaxed text-ink-subtle">
              {lesson.summary}
            </span>
          ) : null}
        </span>

        <span className="hidden shrink-0 flex-col items-end gap-1 pt-0.5 sm:flex">
          <span className="label text-ink-subtle">{lessonTypeLabel(lesson.type)}</span>
          <span className="label tabular-nums text-ink-subtle">
            {lesson.estimatedMinutes} min
          </span>
        </span>
      </Link>
    </li>
  );
}

function LessonMark({
  done,
  next,
  index,
}: {
  done: boolean;
  next?: boolean;
  index?: number;
}) {
  if (done) {
    return (
      <span
        aria-label="Completed"
        className="flex size-5 items-center justify-center rounded-full bg-ink"
      >
        <svg viewBox="0 0 16 16" className="size-3 text-ink-inverse" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.5 3.5L13 4.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "label flex size-5 items-center justify-center rounded-full tabular-nums ring-1",
        next ? "text-accent ring-accent" : "text-ink-subtle ring-border-strong",
      )}
    >
      {index !== undefined ? index : ""}
    </span>
  );
}
