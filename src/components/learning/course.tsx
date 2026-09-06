import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ButtonLink } from "@/components/ui/button";
import { MISSION_TYPE_LABEL } from "@/lib/workspace/labels";
import type { MissionSummary } from "@/lib/workspace/queries";

/**
 * The classroom vocabulary: the pieces a course is made of, drawn once.
 *
 * LOCK is one programme, not four systems. The previous interface had a
 * roadmap, a lesson library and a mission library, each with its own idea of
 * where the learner was, and the learner had to hold all three in their head to
 * work out what to do next. These components exist so that every learning
 * surface says the same thing in the same shape:
 *
 *   CourseProgress    how far through the programme, in one line
 *   ContinueCard      the single dominant action — start, or carry on
 *   PhaseSection      a phase as a section of one course, not a page of its own
 *   ModuleCard        the unit a learner actually chooses between
 *   MissionCallout    the work a module ends in, shown where the module ends
 *   NextUp            forward motion at the bottom of a lesson
 *   LessonOutline     where you are inside a module, without leaving it
 *
 * The rule they share: a card is for something you act on. Structure is
 * typography and rules. That is what keeps a ten-phase programme from reading
 * as a wall of identical rectangles.
 */

/* ── Progress ─────────────────────────────────────────────────────────────── */

/**
 * How far along, in one glance.
 *
 * A bar and a fraction, nothing else. The measure a learner cares about is
 * lessons finished, not experience points, so that is what the bar shows and
 * what the number counts. Percent is written beside it rather than instead of
 * it, because "3 of 8" tells you how much is left and "38%" does not.
 */
export function CourseProgress({
  done,
  total,
  label,
  className,
  size = "default",
}: {
  done: number;
  total: number;
  label: string;
  className?: string;
  size?: "default" | "compact";
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className={cn(
          "w-full overflow-hidden rounded-full bg-border",
          size === "compact" ? "h-1" : "h-1.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
            complete ? "bg-ink" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* The fraction, and only the fraction. The bar above already encodes
          the percentage; printing both is two readings of one number, and the
          fraction is the one that says how much is left. */}
      <p className="label tabular-nums text-ink-subtle">
        {done} / {total} lessons
      </p>
    </div>
  );
}

/* ── The one action ───────────────────────────────────────────────────────── */

/**
 * What to do now, and nothing else.
 *
 * The dominant element of the classroom. Two states, and they are genuinely
 * different questions rather than the same card with different words: somebody
 * who has never opened a lesson needs to be told how the programme works, and
 * somebody mid-way needs to be put back exactly where they were.
 */
export function ContinueCard({
  eyebrow,
  context,
  title,
  description,
  href,
  action,
  progress,
  aside,
}: {
  eyebrow: string;
  /** Where this sits — "01 Think · Module 01". Omitted for Start here. */
  context?: string;
  title: string;
  description: string;
  href: string;
  action: string;
  progress?: { done: number; total: number };
  /** A second, quieter way out. */
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-accent/35 bg-accent-quiet/40 p-6 sm:p-8">
      <p className="label text-accent">{eyebrow}</p>

      {context ? <p className="label mt-3 text-ink-subtle">{context}</p> : null}

      <h2 className="mt-1.5 max-w-measure text-title text-balance">{title}</h2>
      <p className="mt-2 max-w-measure text-[0.9375rem] leading-relaxed text-ink-muted">
        {description}
      </p>

      {progress && progress.total > 0 ? (
        <CourseProgress
          done={progress.done}
          total={progress.total}
          label="Progress in this module"
          size="compact"
          className="mt-5 max-w-xs"
        />
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ButtonLink href={href}>{action}</ButtonLink>
        {aside}
      </div>
    </section>
  );
}

/* ── Phase, as a section of one course ────────────────────────────────────── */

export function PhaseSection({
  number,
  label,
  summary,
  active,
  counts,
  status,
  children,
}: {
  number: number;
  label: string;
  summary: string;
  /** The phase the learner is in. The only one that opens. */
  active?: boolean;
  /** "3 modules · 8 lessons · 2 missions", already assembled. Null when empty. */
  counts?: string | null;
  /** "25% complete", "Coming next" — the right-hand word. */
  status: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "scroll-mt-20 border-t border-border py-6 first:border-t-0 first:pt-0",
        !counts && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex min-w-0 items-baseline gap-3">
          <span
            className={cn(
              "label shrink-0 tabular-nums",
              active ? "text-accent" : "text-ink-subtle",
            )}
          >
            {String(number).padStart(2, "0")}
          </span>
          <h3
            className={cn(
              "text-[1.0625rem] leading-tight font-medium tracking-tight",
              counts ? "text-ink" : "text-ink-muted",
            )}
          >
            {label}
          </h3>
        </div>
        <span className={cn("label shrink-0", active ? "text-accent" : "text-ink-subtle")}>
          {status}
        </span>
      </div>

      <p className="mt-1.5 ml-0 max-w-measure text-sm leading-relaxed text-ink-muted sm:ml-9">
        {summary}
      </p>

      {counts ? (
        <p className="label mt-2 text-ink-subtle sm:ml-9">{counts}</p>
      ) : null}

      {children ? <div className="mt-5 sm:ml-9">{children}</div> : null}
    </section>
  );
}

/* ── Module ───────────────────────────────────────────────────────────────── */

/**
 * The unit a learner actually chooses between.
 *
 * Four questions, in this order: what is this, why open it, how far am I, what
 * happens inside. Anything that does not answer one of those is metadata and
 * belongs on the module's own page.
 */
export function ModuleCard({
  number,
  title,
  summary,
  href,
  lessons,
  lessonsDone,
  missions,
  minutes,
  next,
}: {
  number: number;
  title: string;
  summary: string;
  href: string;
  lessons: number;
  lessonsDone: number;
  missions: number;
  minutes: number;
  /** The one module to open now. Exactly one per phase carries the accent. */
  next?: boolean;
}) {
  const complete = lessons > 0 && lessonsDone === lessons;
  const started = lessonsDone > 0 && !complete;

  const status = complete
    ? "Complete"
    : started
      ? "In progress"
      : next
        ? "Start here"
        : "Not started";

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-card border p-5 transition-colors",
        next
          ? "border-accent/40 bg-accent-quiet/30 hover:border-accent/70"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-sunken",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label tabular-nums text-ink-subtle">
          Module {String(number).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "label",
            complete ? "text-ink-subtle" : started || next ? "text-accent" : "text-ink-subtle",
          )}
        >
          {status}
        </span>
      </div>

      <h4 className="mt-1.5 text-[1.0625rem] leading-snug font-medium tracking-tight text-ink">
        {title}
      </h4>
      {summary ? (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{summary}</p>
      ) : null}

      <div className="mt-5 space-y-3 pt-1">
        {lessons > 0 ? (
          <CourseProgress
            done={lessonsDone}
            total={lessons}
            label={`Progress in ${title}`}
            size="compact"
          />
        ) : null}

        <p className="label flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-subtle">
          {missions > 0 ? (
            <span className="tabular-nums">
              {missions} {missions === 1 ? "mission" : "missions"}
            </span>
          ) : null}
          {minutes > 0 ? <span className="tabular-nums">~{minutes} min</span> : null}
          <span className="text-ink-muted transition-colors group-hover:text-ink">
            {complete ? "Review" : started ? "Continue" : "Open"} →
          </span>
        </p>
      </div>
    </Link>
  );
}

/* ── Mission ──────────────────────────────────────────────────────────────── */

/**
 * The work a module ends in, shown where the module ends.
 *
 * Missions used to live in a library of their own, which made the relationship
 * between learning something and doing it a thing the learner had to infer.
 * Here it is stated: the lessons teach it, the mission applies it, and the
 * deliverable it produces goes into My SaaS. Learn, do, produce, build.
 */
export function MissionCallout({
  entry,
  heading = "Your mission",
}: {
  entry: MissionSummary;
  heading?: string;
}) {
  const { mission, progress } = entry;
  const done = progress?.status === "completed";
  const started = !done && progress !== null;

  return (
    <section className="rounded-card border-l-2 border-accent bg-accent-quiet/30 p-5 sm:p-6">
      <p className="label text-accent">{heading}</p>

      <h3 className="mt-2 max-w-measure text-[1.0625rem] leading-snug font-medium tracking-tight text-ink">
        {mission.title}
      </h3>
      <p className="mt-1.5 max-w-measure text-sm leading-relaxed text-ink-muted">
        {mission.objective}
      </p>

      <p className="label mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-subtle">
        <span>{MISSION_TYPE_LABEL[mission.type]}</span>
        <span className="tabular-nums">{mission.estimated_minutes} min</span>
        <span>
          Produces <span className="text-ink-muted">{mission.deliverable_title}</span>
        </span>
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <ButtonLink href={`/learn/missions/${mission.slug}`} size="sm">
          {done ? "Review the mission" : started ? "Continue the mission" : "Start the mission"}
        </ButtonLink>
        {done ? (
          <span className="label text-ink-subtle">Complete</span>
        ) : (
          <span className="text-sm text-ink-subtle">
            What you produce lands in{" "}
            <span className="text-ink-muted">My SaaS</span>.
          </span>
        )}
      </div>
    </section>
  );
}

/* ── Forward motion ───────────────────────────────────────────────────────── */

/**
 * What comes after this, at the bottom of every lesson.
 *
 * The rule the previous interface broke: a learner should never have to go back
 * to an index to find the next thing. If there is a next lesson it is named
 * here; if the module is finished, the mission is; if the mission is done too,
 * the next module is.
 */
export function NextUp({
  eyebrow,
  title,
  description,
  href,
  action,
  previous,
  emphasis = "primary",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  action: string;
  previous?: { title: string; href: string } | null;
  /**
   * Secondary when something else on the page is the real next step — the
   * module page ends in a mission, and two filled buttons on one screen is two
   * pieces of advice about what to do now.
   */
  emphasis?: "primary" | "secondary";
}) {
  return (
    <section className="border-t-2 border-border-strong pt-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label text-accent">{eyebrow}</p>
          <p className="mt-1.5 max-w-measure text-[1.0625rem] leading-snug font-medium tracking-tight text-ink">
            {title}
          </p>
          {description ? (
            <p className="mt-1 max-w-measure text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <ButtonLink href={href} variant={emphasis === "primary" ? "primary" : "secondary"}>
            {action}
          </ButtonLink>
        </div>
      </div>

      {previous ? (
        <p className="mt-6 border-t border-border pt-3 text-sm">
          <span className="label mr-3 text-ink-subtle">Previous</span>
          <Link
            href={previous.href}
            className="text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
          >
            {previous.title}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/* ── Outline ──────────────────────────────────────────────────────────────── */

export interface OutlineLesson {
  id: string;
  slug: string;
  title: string;
  done: boolean;
}

/**
 * Where you are inside a module, without leaving it.
 *
 * A sticky column beside the lesson on a wide screen, and a collapsed
 * disclosure above it on a narrow one — a `<details>` rather than a drawer,
 * because the outline is a list of links and a list of links does not need
 * JavaScript, a focus trap or a scroll lock to be usable.
 */
export function LessonOutline({
  moduleTitle,
  moduleHref,
  lessons,
  currentId,
  missionTitle,
}: {
  moduleTitle: string;
  moduleHref: string;
  lessons: readonly OutlineLesson[];
  currentId: string;
  missionTitle?: string | null;
}) {
  const done = lessons.filter((lesson) => lesson.done).length;

  const body = (
    <>
      <ol className="mt-3 space-y-0.5">
        {lessons.map((lesson, index) => {
          const here = lesson.id === currentId;
          return (
            <li key={lesson.id}>
              <Link
                href={`/learn/lessons/${lesson.slug}`}
                aria-current={here ? "page" : undefined}
                className={cn(
                  "flex gap-3 rounded-control px-2 py-2 text-sm transition-colors",
                  here
                    ? "bg-accent-quiet font-medium text-ink"
                    : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "label w-4 shrink-0 pt-0.5 text-right tabular-nums",
                    here ? "text-accent" : "text-ink-subtle",
                  )}
                >
                  {lesson.done ? "✓" : index + 1}
                </span>
                <span className={cn("leading-snug", lesson.done && !here && "text-ink-subtle")}>
                  {lesson.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {missionTitle ? (
        <p className="mt-3 border-t border-border pt-3 pl-2">
          <span className="label block text-accent">Then the mission</span>
          <span className="mt-1 block text-sm leading-snug text-ink-muted">{missionTitle}</span>
        </p>
      ) : null}
    </>
  );

  const heading = (
    <>
      <Link
        href={moduleHref}
        className="block text-sm leading-snug font-medium text-ink hover:underline hover:decoration-border-strong hover:underline-offset-4"
      >
        {moduleTitle}
      </Link>
      <CourseProgress
        done={done}
        total={lessons.length}
        label={`Progress in ${moduleTitle}`}
        size="compact"
        className="mt-2.5"
      />
    </>
  );

  return (
    <>
      {/* Narrow: collapsed by default, because the lesson is why you are here. */}
      <details className="group rounded-card border border-border bg-surface-sunken px-4 py-3 xl:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
          <span className="min-w-0">
            <span className="label block text-ink-subtle">This module</span>
            <span className="mt-0.5 block truncate text-sm font-medium text-ink">
              {moduleTitle}
            </span>
          </span>
          <span className="label shrink-0 text-ink-subtle">
            <span className="tabular-nums">
              {done}/{lessons.length}
            </span>
            <span className="ml-2 group-open:hidden">Show</span>
            <span className="ml-2 hidden group-open:inline">Hide</span>
          </span>
        </summary>
        <div className="pt-3">{body}</div>
      </details>

      {/* Wide: always there, sticky, quiet. */}
      <div className="hidden xl:block">
        <div className="sticky top-8">
          <p className="label text-ink-subtle">This module</p>
          <div className="mt-2">{heading}</div>
          {body}
        </div>
      </div>
    </>
  );
}
