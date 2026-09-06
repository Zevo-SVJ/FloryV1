import type { Metadata } from "next";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow, Row, RowValue } from "@/components/ui/list";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Meter, Ring } from "@/components/learning/course";
import { SkillLine } from "@/components/progress/skill";
import { AwardLine } from "@/components/progress/award";
import { ActivityFeed } from "@/components/progress/activity";
import {
  getProgressSnapshot,
  getSkillStates,
  getAwards,
  getActivity,
} from "@/lib/progress/queries";
import { getLearningOverview } from "@/lib/learning/overview";
import { focusPhase, movingSkills, PROGRESS_RULE } from "@/lib/progress/rules";

export const metadata: Metadata = { title: "Progress" };

/**
 * How far along, and nothing that has to be explained twice.
 *
 * The previous version answered six questions and repeated two of them. It
 * redrew the ten-phase roadmap that Learn already owns — eight of those rows
 * reading "Not published yet." one after another — and gave experience points a
 * section of their own with the full scoring table printed underneath.
 *
 * What survives is what a learner actually wants to know, in the order they ask:
 *
 *   how far through the programme am I     one meter
 *   what am I in the middle of             the current phase, with a way in
 *   what can I now do                      skills, which move only on evidence
 *   what have I reached                    milestones
 *   what happened                          recent activity
 *
 * XP is one number on one row at the foot. It exists, it is honest, and it is
 * not what anybody is here for.
 *
 * The rule printed under the overall meter is not decoration: a percentage
 * nobody can explain is a number to be gamed or ignored, and stating how it is
 * computed is cheaper than any amount of trust in it.
 */
export default async function ProgressPage() {
  const [snapshot, skills, awards, activity, overview] = await Promise.all([
    getProgressSnapshot(),
    getSkillStates(),
    getAwards(),
    getActivity(6),
    getLearningOverview(),
  ]);

  const focus = focusPhase(snapshot.phases);
  const moving = movingSkills(skills, 6);

  const earnedAwards = awards.definitions
    .map((award) => ({ award, earned: awards.earned.get(award.key) }))
    .filter(
      (entry): entry is {
        award: (typeof awards.definitions)[number];
        earned: NonNullable<typeof entry.earned>;
      } => entry.earned !== undefined,
    )
    .sort((a, b) => b.earned.earned_at.localeCompare(a.earned.earned_at));

  const percent = snapshot.overall?.percent ?? null;
  const xp = snapshot.xp?.total ?? 0;
  const focusPhaseNode = focus
    ? overview.phases.find((phase) => phase.key === focus.phase_key)
    : null;

  return (
    <Screen
      title="Where you are"
      eyebrow="Progress"
      width="content"
      lede="What you have covered, what you are in the middle of, and — the one that matters — what you can now do that you could not before."
    >
      <div className="space-y-10 sm:space-y-12">
        {/* ── How far through ──────────────────────────────────────────── */}
        <section className="rise">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-56 flex-1">
              <p className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
                Through the programme
              </p>
              <Meter
                done={overview.completedLessons}
                total={overview.totalLessons}
                label="Lessons complete"
                className="mt-3"
                showCount={false}
              />
              <p className="mt-2.5 text-subhead text-ink-muted">
                <span className="font-mono tabular-nums text-ink">
                  {overview.completedLessons} of {overview.totalLessons}
                </span>{" "}
                lessons ·{" "}
                <span className="font-mono tabular-nums text-ink">
                  {overview.missionsDone} of {overview.totalMissions}
                </span>{" "}
                missions
              </p>
            </div>
            <p className="text-large tabular-nums">
              {percent === null ? "—" : `${percent}%`}
            </p>
          </div>
          <p className="mt-4 max-w-read text-footnote text-ink-subtle">{PROGRESS_RULE}</p>
        </section>

        {/* ── What you are in the middle of ────────────────────────────── */}
        {focusPhaseNode ? (
          <Group title="Right now" className="rise rise-1">
            <LinkRow
              href="/learn"
              align="start"
              leading={
                <span className="flex size-7 items-center justify-center font-mono text-footnote tabular-nums text-accent">
                  {String(focusPhaseNode.number).padStart(2, "0")}
                </span>
              }
              title={focusPhaseNode.label}
              detail={focusPhaseNode.summary}
              trailing={
                <Ring
                  done={focusPhaseNode.lessonsDone}
                  total={focusPhaseNode.lessonCount}
                  label={focusPhaseNode.label}
                />
              }
            />
            {overview.nextModule ? (
              <LinkRow
                href={`/learn/modules/${overview.nextModule.module.slug}`}
                title={overview.nextModule.module.title}
                detail="The module you are working through."
                trailing={
                  <RowValue>
                    {overview.nextModule.lessonsDone}/{overview.nextModule.lessons.length}
                  </RowValue>
                }
              />
            ) : null}
          </Group>
        ) : null}

        {/* ── What you can do ──────────────────────────────────────────── */}
        <Group
          title="Skills"
          className="rise rise-2"
          action={<Quiet href="/progress/skills">All skills</Quiet>}
          footnote="A skill moves on evidence — a lesson finished, a mission completed, work approved. Nothing is claimed until one of those has happened."
        >
          {moving.length === 0 ? (
            <EmptyState title="Nothing demonstrated yet">
              Finish a lesson and the first skill starts moving.
            </EmptyState>
          ) : (
            moving.map((skill) => <SkillLine key={skill.skill_key} skill={skill} />)
          )}
        </Group>

        {/* ── What you have reached ────────────────────────────────────── */}
        <Group
          title="Milestones"
          className="rise rise-3"
          action={<Quiet href="/progress/achievements">All milestones</Quiet>}
        >
          {earnedAwards.length === 0 ? (
            <EmptyState
              title="Your first milestone is waiting"
              action={<ButtonLink href="/build" size="sm">Start my SaaS</ButtonLink>}
            >
              Milestones mark real ground — a project named, a problem validated, a
              build deployed. The first is earned the moment you name what you are
              building.
            </EmptyState>
          ) : (
            earnedAwards
              .slice(0, 5)
              .map(({ award, earned }) => (
                <AwardLine key={award.key} award={award} earnedAt={earned.earned_at} />
              ))
          )}
        </Group>

        {/* ── What happened ────────────────────────────────────────────── */}
        {activity.length > 0 ? <ActivityFeed entries={activity} heading="Recent activity" /> : null}

        {/*
         * Experience points, in one row. They are real and they are traceable to
         * the work that produced them — and they are not what anybody is here
         * for, which is what a whole section with a scoring table underneath
         * implied.
         */}
        <Group title="Experience">
          <Row
            title="Points earned"
            detail="Every point is traceable to the lesson, mission or approval that produced it."
            trailing={<RowValue>{xp}</RowValue>}
          />
        </Group>
      </div>
    </Screen>
  );
}

function Quiet({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="tactile text-subhead font-medium text-accent hover:text-accent-hover"
    >
      {children}
    </a>
  );
}
