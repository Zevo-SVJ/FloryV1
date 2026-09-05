import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label } from "@/components/ui/surface";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { PhaseProgressList, CurrentPhase, SectionHeading } from "@/components/progress/phase-progress";
import { SkillLine } from "@/components/progress/skill";
import { AwardLine } from "@/components/progress/award";
import { ActivityFeed } from "@/components/progress/activity";
import {
  getProgressSnapshot,
  getSkillStates,
  getAwards,
  getActivity,
  getXpRules,
} from "@/lib/progress/queries";
import { focusPhase, roadmapFromPhases, movingSkills, PROGRESS_RULE } from "@/lib/progress/rules";
import { XP_EVENT_LABEL } from "@/lib/progress/labels";

export const metadata: Metadata = { title: "Progress" };

/**
 * Where the learner is, at every level that means something.
 *
 * Six levels, six different questions, and the page is laid out in the order
 * somebody actually asks them: overall, then the phase under their feet, then
 * the whole route, then what they can do, then what they have reached, then
 * what happened. XP is last and small, which is the position it deserves.
 *
 * The rule under the global bar is not decoration. A percentage nobody can
 * explain is a number to be gamed or ignored; printing how it is computed is
 * cheaper than any amount of trust in it.
 *
 * This page used to redirect to `/progress/skills`. It is a real page now, and
 * the redirect is gone.
 */
export default async function ProgressPage() {
  const [snapshot, skills, awards, activity, xpRules] = await Promise.all([
    getProgressSnapshot(),
    getSkillStates(),
    getAwards(),
    getActivity(8),
    getXpRules(),
  ]);

  const roadmap = roadmapFromPhases(snapshot.phases);
  const focus = focusPhase(snapshot.phases);
  const moving = movingSkills(skills, 6);

  const earnedAwards = awards.definitions
    .map((award) => ({ award, earned: awards.earned.get(award.key) }))
    .filter(
      (entry): entry is { award: (typeof awards.definitions)[number]; earned: NonNullable<typeof entry.earned> } =>
        entry.earned !== undefined,
    )
    .sort((a, b) => b.earned.earned_at.localeCompare(a.earned.earned_at));

  const percent = snapshot.overall?.percent ?? null;
  const xp = snapshot.xp?.total ?? 0;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Progress"
        title="Where you are"
        description="Six answers, not one number. What you have covered, what you are in the middle of, and — the one that matters — what you can now do that you could not before."
        meta={
          <>
            <HeaderMeta label="Overall">{percent === null ? "—" : `${percent}%`}</HeaderMeta>
            <HeaderMeta label="Phases done">
              {snapshot.overall?.phases_complete ?? 0} / 10
            </HeaderMeta>
            <HeaderMeta label="Milestones">
              {awards.earned.size} / {awards.definitions.length}
            </HeaderMeta>
            <HeaderMeta label="XP">{xp}</HeaderMeta>
          </>
        }
      />

      {/* Overall, and the rule behind it. */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <Label>Overall</Label>
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">Through the LOCK roadmap</span>
                <span className="font-mono text-sm tabular-nums text-ink">
                  {percent === null ? "Nothing published yet" : `${percent}%`}
                </span>
              </div>
              <ProgressBar value={percent} max={100} label="Overall progress" />
              {snapshot.overall ? (
                <p className="text-sm text-ink-subtle">
                  {snapshot.overall.lessons_done} of {snapshot.overall.lessons_total} lessons ·{" "}
                  {snapshot.overall.missions_done} of {snapshot.overall.missions_total} missions
                </p>
              ) : null}
            </div>

            <p className="max-w-measure text-sm text-ink-subtle">{PROGRESS_RULE}</p>
          </Card>
        </section>

        <section className="space-y-3">
          <Label>Current phase</Label>
          {focus ? (
            <CurrentPhase phase={focus} />
          ) : (
            <EmptyState title="Nothing published yet" className="h-full">
              <p>
                The curriculum is written phase by phase. When the first one
                lands, this is where you will see how far into it you are.
              </p>
            </EmptyState>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <SectionHeading label="Phase roadmap" href="/learn" linkLabel="Open the roadmap" />
        <PhaseProgressList phases={snapshot.phases} currentKey={roadmap.current} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <SectionHeading label="Skills" href="/progress/skills" linkLabel="All skills" />
          {moving.length === 0 ? (
            <EmptyState title="Start building to develop your first skills">
              <p>
                A skill moves when you finish a lesson, complete a mission, or
                have work approved — in that order of weight. Reading alone gets
                you to Introduced and no further.
              </p>
              <p className="pt-3">
                <ButtonLink href="/learn/missions" size="sm">
                  See the missions
                </ButtonLink>
              </p>
            </EmptyState>
          ) : (
            <Card className="divide-y divide-border px-5 py-1">
              <ul className="divide-y divide-border">
                {moving.map((skill) => (
                  <SkillLine key={skill.skill_key} skill={skill} />
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading
            label="Milestones"
            href="/progress/achievements"
            linkLabel="All milestones"
          />
          {earnedAwards.length === 0 ? (
            <EmptyState title="Your first milestone is waiting">
              <p>
                Milestones mark real ground — a project named, a problem
                validated, a build deployed. The first one is earned the moment
                you name what you are building.
              </p>
              <p className="pt-3">
                <ButtonLink href="/build" variant="secondary" size="sm">
                  Start my SaaS
                </ButtonLink>
              </p>
            </EmptyState>
          ) : (
            <Card className="px-5 py-2">
              <ul className="divide-y divide-border">
                {earnedAwards.slice(0, 6).map(({ award, earned }) => (
                  <AwardLine key={award.key} award={award} earnedAt={earned.earned_at} />
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      <ActivityFeed entries={activity} />

      {/* XP, last and small. It is a signal, not the point. */}
      <section className="max-w-measure space-y-3">
        <Label>XP</Label>
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-sm text-ink-muted">
              {snapshot.streak?.current_days
                ? `${snapshot.streak.current_days} ${snapshot.streak.current_days === 1 ? "day" : "days"} running · ${snapshot.streak.active_days} active in total`
                : `${snapshot.streak?.active_days ?? 0} active days`}
            </span>
            <span className="font-mono text-[1.0625rem] tabular-nums text-ink">{xp}</span>
          </div>

          <dl className="grid gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            {xpRules.map((rule) => (
              <div key={rule.kind} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{XP_EVENT_LABEL[rule.kind]}</dt>
                <dd className="font-mono tabular-nums text-ink-subtle">{rule.amount}</dd>
              </div>
            ))}
          </dl>

          <p className="text-sm text-ink-subtle">
            Every point is traceable to the lesson, mission or approval that
            produced it. Approved work is worth six lessons, which is the
            product&rsquo;s opinion about what learning is.
          </p>
        </Card>
      </section>
    </div>
  );
}
