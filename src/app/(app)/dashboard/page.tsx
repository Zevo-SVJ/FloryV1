import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { JourneyStrip } from "@/components/learning/journey";
import { ActivityFeed } from "@/components/progress/activity";
import { SkillLine } from "@/components/progress/skill";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { requireProfile } from "@/lib/auth/dal";
import { getLearningOverview } from "@/lib/learning/overview";
import { getProgressSnapshot, getSkillStates, getActivity } from "@/lib/progress/queries";
import { getWorkspaceSnapshot } from "@/lib/workspace/queries";
import { getLearnerMentorView } from "@/lib/mentor/queries";
import { movingSkills } from "@/lib/progress/rules";
import { MISSION_STATUS_LABEL } from "@/lib/workspace/labels";

export const metadata: Metadata = { title: "Home" };

/**
 * One question, answered before anything else: what do I do now?
 *
 * The old home was eight bordered cards of equal weight — next action, progress,
 * current phase, project, skills, wins, activity, and an account form — which is
 * an analytics dashboard, not a workspace. Nothing was more important than
 * anything else, so nothing was important.
 *
 * This gives the next action the whole top of the page at display size, puts the
 * journey strip under it so "where am I" is a shape rather than a percentage,
 * and demotes everything else to a supporting column. The account form stays,
 * because it is the only place to change a display name, but it is a quiet
 * footer rather than a card competing with the work.
 */
export default async function HomePage() {
  const [profile, overview, progress, skills, activity, workspace, mentorView] =
    await Promise.all([
      requireProfile(),
      getLearningOverview(),
      getProgressSnapshot(),
      getSkillStates(),
      getActivity(5),
      getWorkspaceSnapshot(),
      getLearnerMentorView(),
    ]);

  const name = profile.display_name?.trim();
  const { activeKey, nextLesson, nextMission, nextModule, continueLesson, started, phases } =
    overview;
  const moving = movingSkills(skills, 3);
  const returned = mentorView.needsWork[0] ?? null;

  /*
   * The one action, decided by priority rather than by novelty. Returned work
   * outranks everything — a mentor said what to fix, and doing anything else
   * first wastes the review. Then the lesson in flight, then the next lesson,
   * then the mission, then naming the product.
   */
  const action = !started && nextLesson
    ? {
        /*
         * Somebody who has done nothing gets orientation, not a lesson. It is
         * the one case where "what do I do now" is genuinely "understand how
         * this works" — and it is a two-minute read that ends in the first
         * module rather than a detour.
         */
        eyebrow: "Start here",
        title: "Learn how LOCK works",
        body: "Five minutes on how the programme runs, what you will produce, and where to begin. Then you start the first module.",
        href: "/learn/start",
        cta: "Start here",
      }
    : returned
    ? {
        eyebrow: "Returned by your mentor",
        title: returned.title,
        body: "Read what came back and put it right before starting anything new.",
        href: "/mentor",
        cta: "Read the feedback",
      }
    : continueLesson
      ? {
          eyebrow: "Continue",
          title: continueLesson.title,
          body: continueLesson.summary,
          href: `/learn/lessons/${continueLesson.slug}`,
          cta: "Pick up where you left off",
        }
      : nextLesson
        ? {
            eyebrow: nextModule
              ? `${String(nextLesson.phase.number).padStart(2, "0")} ${nextLesson.phase.label} · ${nextModule.module.title}`
              : "Next lesson",
            title: nextLesson.lesson.title,
            body: nextLesson.lesson.summary,
            href: `/learn/lessons/${nextLesson.lesson.slug}`,
            cta: "Start the lesson",
          }
        : nextMission
          ? {
              eyebrow: `Mission · ${MISSION_STATUS_LABEL[nextMission.progress?.status ?? "not_started"]}`,
              title: nextMission.mission.title,
              body: nextMission.mission.objective,
              href: `/learn/missions/${nextMission.mission.slug}`,
              cta: "Open the mission",
            }
          : !workspace.project
            ? {
                eyebrow: "First step",
                title: "Name what you are building",
                body: "Everything a mission produces belongs to a product. Start yours and the rest of the platform has somewhere to put your work.",
                href: "/build",
                cta: "Start my SaaS",
              }
            : {
                eyebrow: "Up to date",
                title: "Everything published so far is done",
                body: "Learn shows the whole programme and which phase is under your feet. The next phase opens as it is written.",
                href: "/learn",
                cta: "Go to Learn",
              };

  return (
    <div className="space-y-12">
      {/* ── The action ───────────────────────────────────────────────────── */}
      <header className="space-y-8">
        <p className="label text-ink-subtle">
          {name ? `${name} · ` : ""}Your build journey
        </p>

        <div className="space-y-4">
          <p className="label text-accent">{action.eyebrow}</p>
          <h1 className="text-display max-w-measure text-balance">{action.title}</h1>
          <p className="max-w-measure text-lede text-ink-muted">{action.body}</p>
          <p className="pt-1">
            <ButtonLink href={action.href}>{action.cta}</ButtonLink>
          </p>
        </div>

        <div className="space-y-3">
          <JourneyStrip
            phases={phases.map((p) => ({
              key: p.key, number: p.number, label: p.label, state: p.state, percent: p.percent,
            }))}
            activeKey={activeKey}
          />
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Quiet href="/learn">See the whole programme</Quiet>
            {nextModule ? (
              /* Not the `label` style: uppercasing a module's title turns a
                 name into a shout, and this is a sentence about where you are. */
              <span className="text-sm text-ink-subtle">
                You are in {nextModule.module.title}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      {/* ── What you are building, and what happened ─────────────────────── */}
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
        <div className="space-y-10">
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
              <h2 className="label text-ink-subtle">Your SaaS</h2>
              <Quiet href="/build">Open My SaaS</Quiet>
            </div>

            {workspace.project ? (
              <div className="space-y-2">
                <p className="text-title">{workspace.project.name}</p>
                <p className="max-w-measure text-sm leading-relaxed text-ink-muted">
                  {workspace.project.description ||
                    workspace.project.problem_statement ||
                    "No description yet. The early missions decide what this is."}
                </p>
                <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1">
                  <span className="label tabular-nums text-ink-subtle">
                    {workspace.completedCount}/{workspace.totalCount} missions
                  </span>
                  <span className="label text-ink-subtle">
                    {workspace.latestArtifact
                      ? `Latest: ${workspace.latestArtifact.title}`
                      : "Nothing produced yet"}
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="max-w-measure text-sm leading-relaxed text-ink-muted">
                  A mission produces something, and that something belongs to a
                  product. Name yours and every artifact you make has somewhere
                  to live.
                </p>
                <ButtonLink href="/build" variant="secondary" size="sm">
                  Start my SaaS
                </ButtonLink>
              </div>
            )}
          </section>

          <ActivityFeed entries={activity} heading="Recent activity" />
        </div>

        {/* ── The supporting column ──────────────────────────────────────── */}
        <div className="space-y-10">
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
              <h2 className="label text-ink-subtle">Progress</h2>
              <Quiet href="/progress">In detail</Quiet>
            </div>
            <dl className="divide-y divide-border">
              <Stat label="Overall">
                {progress.overall?.percent == null ? "—" : `${progress.overall.percent}%`}
              </Stat>
              <Stat label="Lessons">
                {overview.completedLessons}/{overview.totalLessons}
              </Stat>
              <Stat label="Missions">
                {workspace.completedCount}/{workspace.totalCount}
              </Stat>
            </dl>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
              <h2 className="label text-ink-subtle">Skills</h2>
              <Quiet href="/progress/skills">All skills</Quiet>
            </div>
            {moving.length === 0 ? (
              <p className="max-w-measure text-sm leading-relaxed text-ink-subtle">
                A skill moves on evidence — a lesson finished, a mission
                completed, work approved. Nothing is claimed until one of those
                has happened.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {moving.map((skill) => (
                  <SkillLine key={skill.skill_key} skill={skill} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ── Account, as a footer rather than a card ──────────────────────── */}
      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="label text-ink-subtle">Your account</h2>
        <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10">
          <DisplayNameForm current={profile.display_name} />
          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 self-start pt-1">
            <Stat inline label="Role">{profile.role}</Stat>
            <Stat inline label="Member since">
              {new Date(profile.created_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
              })}
            </Stat>
          </dl>
        </div>
      </section>
    </div>
  );
}

function Quiet({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
    >
      {children}
    </Link>
  );
}

function Stat({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="flex items-baseline gap-2">
        <dt className="label text-ink-subtle">{label}</dt>
        <dd className="text-sm text-ink">{children}</dd>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-ink">{children}</dd>
    </div>
  );
}
