import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ButtonLink } from "@/components/ui/button";
import { Icon, StatusMark } from "@/components/ui/icon";
import { LinkRow, RowValue } from "@/components/ui/list";
import { MISSION_TYPE_LABEL } from "@/lib/workspace/labels";
import type { MissionSummary } from "@/lib/workspace/queries";

/**
 * The classroom vocabulary: the pieces a course is made of, drawn once.
 *
 * The rule they share: LOCK is one programme, and every learning surface should
 * say the same thing in the same shape. What changed in this pass is what those
 * shapes *are* — the previous set reached for a bordered card at every level,
 * which produced a page of equal-weight rectangles with no hierarchy in it.
 *
 *   Meter          progress, as a track and a fraction — never both a bar and a percent
 *   NextAction     the one thing to do, set at title size and impossible to miss
 *   PhaseRow       a phase as a row in a list, not a card in a grid
 *   ModuleRow      a module as a row, with its progress on the trailing edge
 *   MissionCallout the work a module ends in, shown where the module ends
 *   NextUp         forward motion at the foot of a lesson
 *   OutlineList    where you are inside a module
 */

/* ── Progress ─────────────────────────────────────────────────────────────── */

/**
 * How far along, in one glance.
 *
 * A track and a fraction. The bar already encodes the percentage, so printing
 * the percentage beside it is two readings of one number — and the fraction is
 * the one that answers "how much is left".
 */
export function Meter({
  done,
  total,
  label,
  className,
  showCount = true,
  tone = "accent",
}: {
  done: number;
  total: number;
  label: string;
  className?: string;
  showCount?: boolean;
  tone?: "accent" | "ink";
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-pill bg-ink/[0.09]"
      >
        <div
          className={cn(
            "h-full rounded-pill transition-[width] duration-[--duration-slow] ease-[--ease-out] motion-reduce:transition-none",
            complete || tone === "ink" ? "bg-ink" : "bg-accent",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showCount ? (
        <span className="shrink-0 font-mono text-footnote tabular-nums text-ink-subtle">
          {done}/{total}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A small ring, for a count that belongs on the trailing edge of a row.
 *
 * Closer to an activity ring than to a bar chart, which is the point: it is
 * glanceable at 28px and says nothing more than "this much of that".
 */
export function Ring({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const fraction = total > 0 ? Math.min(1, done / total) : 0;
  const complete = total > 0 && done === total;
  const circumference = 2 * Math.PI * 10;

  return (
    <span
      role="img"
      aria-label={`${label}: ${done} of ${total}`}
      className="relative flex size-7 items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="size-7 -rotate-90" aria-hidden focusable="false">
        <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2.5" className="stroke-ink/[0.1]" />
        {fraction > 0 ? (
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            className={complete ? "stroke-ink" : "stroke-accent"}
          />
        ) : null}
      </svg>
      {complete ? (
        <Icon name="check" className="absolute size-3 text-ink" strokeWidth="2.8" />
      ) : null}
    </span>
  );
}

/* ── The one action ───────────────────────────────────────────────────────── */

/**
 * What to do now, and nothing else.
 *
 * The dominant element of a screen that has one. It is not a card: a tinted box
 * with a border around the most important thing on the page makes it look like
 * an advertisement inside the product. Instead it is simply set large, given
 * air, and closed with the only filled-accent button on the screen — which is
 * how a system application says "this one".
 */
export function NextAction({
  eyebrow,
  context,
  title,
  description,
  href,
  action,
  progress,
  aside,
  className,
}: {
  eyebrow: string;
  /** Where this sits — "01 Think · Shaping the problem". */
  context?: string;
  title: string;
  description: string;
  href: string;
  action: string;
  progress?: { done: number; total: number; label: string };
  /** A second, quieter way out. */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rise", className)}>
      <p className="text-footnote font-semibold tracking-[0.01em] text-accent uppercase">
        {eyebrow}
      </p>

      {context ? (
        <p className="mt-3 text-subhead text-ink-subtle">{context}</p>
      ) : null}

      <h2 className="mt-1.5 max-w-read text-title1">{title}</h2>
      <p className="mt-2 max-w-read text-body text-ink-muted">{description}</p>

      {progress && progress.total > 0 ? (
        <Meter
          done={progress.done}
          total={progress.total}
          label={progress.label}
          className="mt-5 max-w-56"
        />
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ButtonLink href={href} variant="accent">
          {action}
          <Icon name="forward" className="size-[1.05rem]" strokeWidth="2.2" />
        </ButtonLink>
        {aside}
      </div>
    </section>
  );
}

/* ── Phase ────────────────────────────────────────────────────────────────── */

/**
 * A phase, as one row of the programme.
 *
 * Ten of these read as a table of contents. Ten cards read as ten products.
 * The state word is the only thing on the trailing edge, because a phase is
 * something you locate yourself against, not something you act on.
 */
export function PhaseRow({
  number,
  label,
  summary,
  state,
  done,
  total,
  href,
}: {
  number: number;
  label: string;
  summary: string;
  state: "here" | "done" | "open" | "soon" | "later";
  done: number;
  total: number;
  /** Only a published phase is a destination. */
  href?: string;
}) {
  const word =
    state === "done"
      ? "Complete"
      : state === "here"
        ? "You are here"
        : state === "open"
          ? "Not started"
          : state === "soon"
            ? "Being written"
            : "Later";

  const leading = (
    <span
      className={cn(
        "flex size-7 items-center justify-center font-mono text-footnote tabular-nums",
        state === "here" ? "text-accent" : "text-ink-subtle",
      )}
    >
      {String(number).padStart(2, "0")}
    </span>
  );

  const trailing =
    total > 0 ? (
      <Ring done={done} total={total} label={`${label} lessons`} />
    ) : (
      <span className="text-footnote text-ink-subtle">{word}</span>
    );

  const title = (
    <span className="flex flex-wrap items-baseline gap-x-2.5">
      <span className={state === "later" || state === "soon" ? "text-ink-muted" : undefined}>
        {label}
      </span>
      {state === "here" ? (
        <span className="text-caption font-semibold text-accent uppercase">{word}</span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <LinkRow href={href} leading={leading} title={title} detail={summary} trailing={trailing} align="start" />
    );
  }

  return (
    <div className="relative flex items-start gap-3.5 px-4 py-3.5 before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-separator first:before:hidden">
      <span className="shrink-0 pt-0.5">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] leading-snug font-medium text-ink-muted">
          {label}
        </span>
        <span className="mt-1 block text-subhead leading-normal text-ink-subtle">{summary}</span>
      </span>
      <span className="shrink-0 pt-0.5 text-footnote text-ink-subtle">{word}</span>
    </div>
  );
}

/* ── Module ───────────────────────────────────────────────────────────────── */

/**
 * A module, as a row with its progress on the end.
 *
 * The unit a learner actually chooses between, so it answers four questions in
 * order: what is this, why open it, how far am I, how long will it take.
 * Anything else is metadata and belongs on the module's own screen.
 */
export function ModuleRow({
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

  return (
    <LinkRow
      href={href}
      align="start"
      /* The number identifies the module; the ring on the trailing edge says
         how far through it you are. Putting a progress mark on both ends was
         one fact drawn twice. */
      leading={
        <StatusMark state={complete ? "done" : next ? "current" : "todo"} index={complete ? undefined : number} />
      }
      title={
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span>{title}</span>
          {next && !complete ? (
            <span className="text-caption font-semibold text-accent uppercase">
              {lessonsDone > 0 ? "Continue" : "Start here"}
            </span>
          ) : null}
        </span>
      }
      detail={
        <>
          {summary}
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-ink-subtle">
            <span className="font-mono tabular-nums">
              {lessonsDone}/{lessons} lessons
            </span>
            {missions > 0 ? <span>{missions === 1 ? "1 mission" : `${missions} missions`}</span> : null}
            {minutes > 0 ? <span className="font-mono tabular-nums">~{minutes} min</span> : null}
          </span>
        </>
      }
      trailing={lessons > 0 ? <Ring done={lessonsDone} total={lessons} label={title} /> : undefined}
    />
  );
}

/* ── Mission ──────────────────────────────────────────────────────────────── */

/**
 * The work a module ends in, shown where the module ends.
 *
 * The one place the accent is allowed to become a surface, because this is the
 * moment the product exists for: the point where learning turns into something
 * that exists. It says what it produces and where that lands, so the
 * relationship between a lesson and a product is stated rather than inferred.
 */
export function MissionCallout({
  entry,
  heading = "Your mission",
  ready = true,
}: {
  entry: MissionSummary;
  heading?: string;
  /**
   * Whether the lessons this mission rests on are done.
   *
   * The mission is always reachable — nothing here locks it, and the real
   * prerequisites live in the database. What changes is weight: while the
   * lessons are unread the mission is the *second* thing on the screen, and a
   * filled accent button on it competes with the lesson the learner should
   * open first.
   */
  ready?: boolean;
}) {
  const { mission, progress } = entry;
  const done = progress?.status === "completed";
  const started = !done && progress !== null;
  const emphasised = ready || done || started;

  return (
    <section className="overflow-hidden rounded-card bg-accent-quiet/70 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-footnote font-semibold tracking-[0.01em] text-accent uppercase">
        <Icon name="target" className="size-[1.05rem]" />
        {heading}
      </p>

      <h3 className="mt-3 max-w-read text-title3">{mission.title}</h3>
      <p className="mt-1.5 max-w-read text-subhead text-ink-muted">{mission.objective}</p>

      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-ink-subtle">
        <span>{MISSION_TYPE_LABEL[mission.type]}</span>
        <span className="font-mono tabular-nums">{mission.estimated_minutes} min</span>
        <span>
          Produces <span className="text-ink-muted">{mission.deliverable_title}</span>
        </span>
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ButtonLink
          href={`/learn/missions/${mission.slug}`}
          variant={emphasised ? "accent" : "secondary"}
          size="sm"
        >
          {done ? "Review the mission" : started ? "Continue the mission" : "Start the mission"}
        </ButtonLink>
        <span className="text-footnote text-ink-subtle">
          {done
            ? "Complete"
            : emphasised
              ? "What you produce lands in My SaaS."
              : "The lessons above come first. What you produce lands in My SaaS."}
        </span>
      </div>
    </section>
  );
}

/* ── Forward motion ───────────────────────────────────────────────────────── */

/**
 * What comes after this, at the foot of a screen.
 *
 * The rule the interface used to break: a learner should never have to go back
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
  emphasis?: "primary" | "secondary";
}) {
  return (
    <section>
      <div className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-[var(--shadow-control)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-footnote font-semibold tracking-[0.01em] text-accent uppercase">
            {eyebrow}
          </p>
          <p className="mt-2 max-w-read text-title3">{title}</p>
          {description ? (
            <p className="mt-1 max-w-read text-subhead text-ink-muted">{description}</p>
          ) : null}
        </div>
        <div className="shrink-0">
          <ButtonLink href={href} variant={emphasis === "primary" ? "accent" : "secondary"}>
            {action}
            <Icon name="forward" className="size-[1.05rem]" strokeWidth="2.2" />
          </ButtonLink>
        </div>
      </div>

      {previous ? (
        <p className="mt-3 px-1">
          <Link
            href={previous.href}
            className="tactile inline-flex items-center gap-1.5 text-subhead text-ink-subtle hover:text-ink"
          >
            <Icon name="back" className="size-4" strokeWidth="2.2" />
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
 * Where you are inside a module.
 *
 * It used to be a permanent third column on wide screens, which put a
 * navigation list beside the thing you were meant to be reading. It lives in a
 * sheet now, reached from the toolbar: the same control and the same list at
 * every width, so there is one behaviour to learn and the reading column is
 * never competing with a table of contents.
 */
export function OutlineList({
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

  return (
    <div className="space-y-3">
      <Link
        href={moduleHref}
        className="tactile block rounded-control px-3 py-2.5 hover:bg-ink/[0.04]"
      >
        <span className="block text-footnote text-ink-subtle">Module</span>
        <span className="mt-0.5 block text-subhead font-medium text-ink">{moduleTitle}</span>
        <Meter done={done} total={lessons.length} label={moduleTitle} className="mt-2.5" />
      </Link>

      <ol className="space-y-0.5">
        {lessons.map((lesson, index) => {
          const here = lesson.id === currentId;
          return (
            <li key={lesson.id}>
              <Link
                href={`/learn/lessons/${lesson.slug}`}
                aria-current={here ? "page" : undefined}
                className={cn(
                  "tactile flex items-center gap-3 rounded-control px-3 py-2.5 text-subhead",
                  here
                    ? "bg-ink/[0.06] font-medium text-ink"
                    : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                <StatusMark
                  state={lesson.done ? "done" : here ? "current" : "todo"}
                  index={lesson.done || here ? undefined : index + 1}
                  className="size-5 text-[0.625rem]"
                />
                <span className="min-w-0 flex-1 leading-snug">{lesson.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {missionTitle ? (
        <div className="rounded-control bg-accent-quiet/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-accent uppercase">
            <Icon name="target" className="size-3.5" />
            Then the mission
          </p>
          <p className="mt-1 text-subhead text-ink-muted">{missionTitle}</p>
        </div>
      ) : null}
    </div>
  );
}

/** A count on a row's trailing edge, kept here so the units read the same everywhere. */
export function Count({ value, unit }: { value: number; unit: string }) {
  return (
    <RowValue>
      {value} {unit}
    </RowValue>
  );
}
