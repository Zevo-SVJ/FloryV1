import Link from "next/link";
import { Card, Label } from "@/components/ui/surface";
import { Row } from "@/components/ui/list";
import { cn } from "@/lib/utils/cn";
import {
  SKILL_STATE_LABEL,
  SKILL_STATE_MEANING,
  SKILL_STATE_RANK,
  SKILL_STATE_COUNT,
} from "@/lib/progress/labels";
import type { LearnerSkillStateRow, SkillState } from "@/types/database";

/**
 * A skill's state, drawn as four steps rather than as a percentage.
 *
 * The brief asked for "Claude Code — Developing" instead of "Validation — 72%",
 * and a bar would quietly reintroduce the percentage: a filled rectangle is
 * read as a fraction whether or not a number is printed beside it. Four
 * discrete segments cannot be read that way. They say which of four things is
 * true, which is all the system actually knows.
 *
 * The step is never carried by colour alone — the label beside it names the
 * state in words, so the meaning survives a monochrome screen.
 */
export function SkillMeter({ state }: { state: SkillState }) {
  const rank = SKILL_STATE_RANK[state];

  return (
    <span
      role="img"
      aria-label={`${SKILL_STATE_LABEL[state]} — step ${rank} of ${SKILL_STATE_COUNT}`}
      className="inline-flex shrink-0 items-center gap-[3px]"
    >
      {Array.from({ length: SKILL_STATE_COUNT }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1 w-4 rounded-full",
            index < rank
              ? rank >= SKILL_STATE_RANK.demonstrated
                ? "bg-accent"
                : "bg-ink-subtle"
              : "bg-surface-sunken",
          )}
        />
      ))}
    </span>
  );
}

/**
 * One skill, with what it claims and what it is claimed on.
 *
 * `demonstrates` is shown only once the skill has actually reached
 * `demonstrated`. Below that the card shows the state's meaning instead —
 * printing "You can find a problem worth solving" beside a skill somebody has
 * only read about would be the platform congratulating them for nothing.
 */
export function SkillCard({
  skill,
  evidence,
}: {
  skill: LearnerSkillStateRow;
  /** Already-rendered lines. Built by the server; see the skills page. */
  evidence?: readonly string[];
}) {
  const proven = SKILL_STATE_RANK[skill.state] >= SKILL_STATE_RANK.demonstrated;

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3
          className={cn(
            "text-[0.9375rem] font-medium",
            skill.state === "not_started" ? "text-ink-muted" : "text-ink",
          )}
        >
          {skill.label}
        </h3>
        <div className="flex items-center gap-3">
          <SkillMeter state={skill.state} />
          <span className={cn("label", proven ? "text-accent" : "text-ink-subtle")}>
            {SKILL_STATE_LABEL[skill.state]}
          </span>
        </div>
      </div>

      <p className="text-sm text-ink-muted">{skill.summary}</p>

      <p className="text-sm text-ink-subtle">
        {proven ? skill.demonstrates : SKILL_STATE_MEANING[skill.state]}
      </p>

      {evidence && evidence.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Label>Evidence</Label>
          <ul className="space-y-1.5">
            {evidence.map((line) => (
              <li key={line} className="flex gap-3 text-sm text-ink-muted">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-border-strong" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

/** The compact form, for the dashboard. One line each, no card. */
export function SkillLine({ skill }: { skill: LearnerSkillStateRow }) {
  return (
    <Row
      title={skill.label}
      trailing={
        <>
          <SkillMeter state={skill.state} />
          <span>{SKILL_STATE_LABEL[skill.state]}</span>
        </>
      }
    />
  );
}

/** A heading that links through to the full page. Used on the dashboard. */
export function SkillsHeading({ href = "/progress/skills" }: { href?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <Label as="h2">Skills</Label>
      <Link
        href={href}
        className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
      >
        All skills
      </Link>
    </div>
  );
}

/**
 * The skills a lesson or a mission develops, named on the page itself.
 *
 * Small and stated rather than a section: the learner should know what a piece
 * of content is *for* before they spend an hour on it, and "this develops
 * Validation and Product Writing" is that in one line. The link goes to the
 * skills page, where the state and the evidence live.
 */
export function SkillTags({
  skills,
  heading = "Develops",
  primaryKey,
}: {
  skills: readonly { key: string; label: string }[];
  heading?: string;
  /** Marked as the one the content is actually about. */
  primaryKey?: string;
}) {
  if (skills.length === 0) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="label text-ink-subtle">{heading}</span>
      {skills.map((skill) => (
        <Link
          key={skill.key}
          href="/progress/skills"
          className={cn(
            "label inline-flex items-center rounded-full px-2 py-1 transition-colors",
            skill.key === primaryKey
              ? "bg-accent-quiet text-accent hover:bg-accent-quiet/70"
              : "bg-surface-sunken text-ink-subtle hover:text-ink",
          )}
        >
          {skill.label}
        </Link>
      ))}
    </p>
  );
}
