import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CurrentPhase, SectionHeading } from "@/components/progress/phase-progress";
import { SkillLine, SkillsHeading } from "@/components/progress/skill";
import { AwardLine } from "@/components/progress/award";
import { ActivityFeed } from "@/components/progress/activity";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { requireProfile } from "@/lib/auth/dal";
import { getProgressSnapshot, getSkillStates, getAwards, getActivity } from "@/lib/progress/queries";
import { getWorkspaceSnapshot } from "@/lib/workspace/queries";
import { getLearnerMentorView } from "@/lib/mentor/queries";
import { focusPhase, movingSkills } from "@/lib/progress/rules";
import { MISSION_STATUS_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Home" };

/**
 * The command centre, now that there is something to command.
 *
 * Prompt 2 drew this page as six empty blocks and said Prompt 3 would fill
 * them. Every one is filled here, from the source of truth for that particular
 * question — progress from the views, the product from the workspace, feedback
 * from the mentor layer. Nothing on this page recomputes anything.
 *
 * The order is the order somebody asks: where am I, what do I do next, what am
 * I building, what did I develop, what have I reached, what happened, and — the
 * one that jumps the queue when it applies — what feedback is waiting.
 *
 * Every block still degrades to a real empty state, because a brand-new
 * account is the state this page will be in on day one and most of the
 * curriculum is still unwritten. An empty card of zeros would be worse than
 * the honest sentence.
 */
export default async function HomePage() {
  const [profile, snapshot, skills, awards, activity, workspace, mentorView] =
    await Promise.all([
      requireProfile(),
      getProgressSnapshot(),
      getSkillStates(),
      getAwards(),
      getActivity(6),
      getWorkspaceSnapshot(),
      getLearnerMentorView(),
    ]);

  const name = profile.display_name?.trim();
  const focus = focusPhase(snapshot.phases);
  const moving = movingSkills(skills, 4);
  const percent = snapshot.overall?.percent ?? null;

  const recentAwards = awards.definitions
    .flatMap((award) => {
      const earned = awards.earned.get(award.key);
      return earned ? [{ award, earned }] : [];
    })
    .sort((a, b) => b.earned.earned_at.localeCompare(a.earned.earned_at))
    .slice(0, 4);

  /*
   * The next action, decided once and in one place.
   *
   * Returned work outranks everything: a mentor said what to fix, and doing
   * anything else first wastes the review. After that it is the mission in
   * flight, then naming the product, then the roadmap.
   */
  const next = nextAction({ mentorView, workspace });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title={name ? `Welcome, ${name}.` : "Welcome."}
        description="You are the founder. The tools are the execution layer. Your job is to think, decide, direct, build, verify, ship and operate."
        meta={
          <>
            <HeaderMeta label="Phase">{focus?.label ?? "Not started"}</HeaderMeta>
            <HeaderMeta label="Missions done">
              {snapshot.overall?.missions_done ?? 0}
            </HeaderMeta>
            <HeaderMeta label="Milestones">{awards.earned.size}</HeaderMeta>
            <HeaderMeta label="XP">{snapshot.xp?.total ?? 0}</HeaderMeta>
          </>
        }
      />

      {/* Feedback waiting jumps the queue. It is the only block that appears
          conditionally, because a returned artifact is genuinely urgent. */}
      {mentorView.needsWork.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">Act on this</Label>
          <Card className="space-y-3 border-accent/40 p-5">
            <p className="text-[0.9375rem] font-medium text-ink">
              {mentorView.needsWork.length === 1
                ? "Your mentor sent work back."
                : `Your mentor sent ${mentorView.needsWork.length} pieces of work back.`}
            </p>
            <ul className="space-y-1">
              {mentorView.needsWork.map((artifact) => (
                <li key={artifact.id} className="text-sm text-ink-muted">
                  {artifact.title}
                </li>
              ))}
            </ul>
            <p className="pt-1">
              <ButtonLink href="/mentor" size="sm">
                Read the feedback
              </ButtonLink>
            </p>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <Label as="h2">Next action</Label>
          <Card className="flex h-full flex-col justify-between gap-4 p-5">
            <div className="space-y-2">
              <p className="label text-ink-subtle">{next.eyebrow}</p>
              <p className="text-[1.0625rem] font-medium text-ink">{next.title}</p>
              <p className="max-w-measure text-sm text-ink-muted">{next.body}</p>
            </div>
            <p>
              <ButtonLink href={next.href} size="sm">
                {next.cta}
              </ButtonLink>
            </p>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeading label="Progress" href="/progress" linkLabel="In detail" />
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">Overall</span>
                <span className="font-mono text-sm tabular-nums text-ink">
                  {percent === null ? "—" : `${percent}%`}
                </span>
              </div>
              <ProgressBar value={percent} max={100} label="Overall progress" />
            </div>
            <p className="text-sm text-ink-subtle">
              {percent === null
                ? "Nothing is published yet, so there is nothing to be a fraction of."
                : `${snapshot.overall?.phases_complete ?? 0} of 10 phases complete.`}
            </p>
          </Card>
        </section>
      </div>

      {focus ? (
        <section className="space-y-3">
          <SectionHeading label="Current phase" href="/learn" linkLabel="The roadmap" />
          <CurrentPhase phase={focus} />
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <SectionHeading label="Your SaaS" href="/build" linkLabel="Open My SaaS" />
          {workspace.project ? (
            <Card className="h-full space-y-3 p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[1.0625rem] font-medium text-ink">
                  {workspace.project.name}
                </h3>
                <Badge>{workspace.project.status}</Badge>
              </div>
              <p className="max-w-measure text-sm text-ink-muted">
                {workspace.project.description ||
                  workspace.project.problem_statement ||
                  "No description yet. The early phases decide what this is."}
              </p>
              <p className="text-sm text-ink-subtle">
                {workspace.completedCount} of {workspace.totalCount} missions ·{" "}
                {workspace.latestArtifact
                  ? `Latest: ${workspace.latestArtifact.title}`
                  : "Nothing produced yet"}
              </p>
            </Card>
          ) : (
            <EmptyState title="Create your first SaaS project" className="h-full">
              <p>
                A mission produces something, and that something belongs to a
                product. Name yours and every artifact you make from here has
                somewhere to live.
              </p>
              <p className="pt-3">
                <ButtonLink href="/build" variant="secondary" size="sm">
                  Start my SaaS
                </ButtonLink>
              </p>
            </EmptyState>
          )}
        </section>

        <section className="space-y-3">
          <SkillsHeading />
          {moving.length === 0 ? (
            <EmptyState title="Start building to develop your first skills" className="h-full">
              <p>
                Skills move on evidence — a lesson finished, a mission
                completed, work approved. Nothing is claimed until one of those
                has happened.
              </p>
            </EmptyState>
          ) : (
            <Card className="h-full px-5 py-2">
              <ul className="divide-y divide-border">
                {moving.map((skill) => (
                  <SkillLine key={skill.skill_key} skill={skill} />
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <SectionHeading
            label="Recent wins"
            href="/progress/achievements"
            linkLabel="All milestones"
          />
          {recentAwards.length === 0 ? (
            <EmptyState title="Your first milestone is waiting" className="h-full">
              <p>
                Milestones are earned by work — a project named, a problem
                validated, a build deployed. None of them by opening a page.
              </p>
            </EmptyState>
          ) : (
            <Card className="h-full px-5 py-2">
              <ul className="divide-y divide-border">
                {recentAwards.map(({ award, earned }) => (
                  <AwardLine key={award.key} award={award} earnedAt={earned.earned_at} />
                ))}
              </ul>
            </Card>
          )}
        </section>

        <ActivityFeed entries={activity} />
      </div>

      <section className="max-w-measure space-y-3">
        <Label as="h2">Your account</Label>
        <Card className="space-y-6 p-5">
          <DisplayNameForm current={profile.display_name} />

          <dl className="grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="label text-ink-subtle">Role</dt>
              <dd>{profile.role}</dd>
            </div>
            <div className="space-y-1">
              <dt className="label text-ink-subtle">Member since</dt>
              <dd>
                {/* A fixed locale and time zone: the server and the browser must
                    format this identically or React reports a hydration
                    mismatch, and "today" is different in two places at once. */}
                {new Date(profile.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}

interface NextAction {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}

/**
 * One recommended action, chosen by priority rather than by novelty.
 *
 * A list of five suggestions is not a recommendation. This returns exactly
 * one, and the order it tries them in is the order the program itself would
 * put them: fix what came back, finish what is open, name the product, then
 * look at the route.
 */
function nextAction({
  mentorView,
  workspace,
}: {
  mentorView: Awaited<ReturnType<typeof getLearnerMentorView>>;
  workspace: Awaited<ReturnType<typeof getWorkspaceSnapshot>>;
}): NextAction {
  const returned = mentorView.needsWork[0];
  if (returned) {
    return {
      eyebrow: "Returned",
      title: returned.title,
      body: "Your mentor said what to fix and why. Doing anything else first wastes the review.",
      href: "/mentor",
      cta: "Read the feedback",
    };
  }

  const current = workspace.current;
  if (current) {
    const status = current.progress?.status ?? "not_started";
    return {
      eyebrow: `Mission · ${MISSION_STATUS_LABEL[status]}`,
      title: current.mission.title,
      body: current.mission.objective,
      href: `/learn/missions/${current.mission.slug}`,
      cta: status === "not_started" ? "Start the mission" : "Continue",
    };
  }

  if (!workspace.project) {
    return {
      eyebrow: "First step",
      title: "Name what you are building",
      body: "Everything a mission produces belongs to a product. Start yours and the rest of the platform has somewhere to put your work.",
      href: "/build",
      cta: "Start my SaaS",
    };
  }

  return {
    eyebrow: "Roadmap",
    title: "Look at what comes next",
    body: "Nothing is open right now. The roadmap shows the whole route and which phase is under your feet.",
    href: "/learn",
    cta: "See the roadmap",
  };
}
