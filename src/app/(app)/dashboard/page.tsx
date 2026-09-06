import type { Metadata } from "next";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow, Row, RowValue } from "@/components/ui/list";
import { Icon } from "@/components/ui/icon";
import { Meter, NextAction } from "@/components/learning/course";
import { ActivityFeed } from "@/components/progress/activity";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { requireProfile } from "@/lib/auth/dal";
import { getLearningOverview } from "@/lib/learning/overview";
import { getProgressSnapshot, getActivity } from "@/lib/progress/queries";
import { getWorkspaceSnapshot } from "@/lib/workspace/queries";
import { getLearnerMentorView } from "@/lib/mentor/queries";

export const metadata: Metadata = { title: "Home" };

/**
 * One question, answered before anything else: what do I do now?
 *
 * Home is not a dashboard and this is the version that finally stops being one.
 * The next action gets the top of the screen at title size and the only
 * filled-accent button on it. Everything under it is a *summary that links
 * somewhere* — three short groups, each of which is the answer to a question
 * somebody actually asks, and none of which repeats what the group beside it
 * says.
 *
 *   Your SaaS   what am I building, and what have I produced
 *   Progress    how far am I
 *   Activity    what happened, only when something has
 *
 * XP is gone from here. It exists, it is on the progress screen, and it is not
 * what a learner comes to Home to find out.
 */
export default async function HomePage() {
  const [profile, overview, progress, activity, workspace, mentorView] = await Promise.all([
    requireProfile(),
    getLearningOverview(),
    getProgressSnapshot(),
    getActivity(4),
    getWorkspaceSnapshot(),
    getLearnerMentorView(),
  ]);

  const name = profile.display_name?.trim();
  const { nextLesson, nextMission, nextModule, continueLesson, started } = overview;
  const returned = mentorView.needsWork[0] ?? null;

  /*
   * The one action, decided by priority rather than by novelty. Returned work
   * outranks everything — a mentor said what to fix, and doing anything else
   * first wastes the review. Then orientation for somebody who has done
   * nothing, then the lesson in flight, then the next lesson, then the mission,
   * then naming the product.
   */
  const action = returned
    ? {
        eyebrow: "Returned by your mentor",
        context: undefined,
        title: returned.title,
        body: "Read what came back and put it right before starting anything new.",
        href: "/mentor",
        cta: "Read the feedback",
      }
    : !started && nextLesson
      ? {
          eyebrow: "Start here",
          context: undefined,
          title: "Learn how LOCK works",
          body: "Five minutes on how the programme runs, what you will produce, and where to begin. Then you start the first module.",
          href: "/learn/start",
          cta: "Start here",
        }
      : continueLesson
        ? {
            eyebrow: "Pick up where you left off",
            context: nextModule?.module.title,
            title: continueLesson.title,
            body: continueLesson.summary,
            href: `/learn/lessons/${continueLesson.slug}`,
            cta: "Continue",
          }
        : nextLesson
          ? {
              eyebrow: "Continue learning",
              context: `${String(nextLesson.phase.number).padStart(2, "0")} ${nextLesson.phase.label}${nextModule ? ` · ${nextModule.module.title}` : ""}`,
              title: nextLesson.lesson.title,
              body: nextLesson.lesson.summary,
              href: `/learn/lessons/${nextLesson.lesson.slug}`,
              cta: "Continue",
            }
          : nextMission
            ? {
                eyebrow: "Continue your mission",
                context: "Every lesson so far is done",
                title: nextMission.mission.title,
                body: nextMission.mission.objective,
                href: `/learn/missions/${nextMission.mission.slug}`,
                cta: "Open the mission",
              }
            : !workspace.project
              ? {
                  eyebrow: "First step",
                  context: undefined,
                  title: "Name what you are building",
                  body: "Everything a mission produces belongs to a product. Start yours and the rest of the platform has somewhere to put your work.",
                  href: "/build",
                  cta: "Start my SaaS",
                }
              : {
                  eyebrow: "You are up to date",
                  context: undefined,
                  title: "Everything published so far is done",
                  body: "The next phase opens as it is written. Your work so far is in My SaaS.",
                  href: "/learn",
                  cta: "Go to Learn",
                };

  return (
    <Screen
      title={name ? `Hello, ${name}` : "Home"}
      width="content"
      hideTitle
    >
      <div className="space-y-10 pt-2 sm:space-y-12">
        <NextAction
          eyebrow={action.eyebrow}
          context={action.context}
          title={action.title}
          description={action.body}
          href={action.href}
          action={action.cta}
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ── What you are building ─────────────────────────────────────── */}
          <Group
            title="Your SaaS"
            className="rise rise-1"
            action={
              <LinkText href="/build">{workspace.project ? "Open" : "Start"}</LinkText>
            }
          >
            {workspace.project ? (
              <>
                <Row
                  align="start"
                  title={workspace.project.name}
                  detail={
                    workspace.project.description ||
                    workspace.project.problem_statement ||
                    "No description yet. The early missions decide what this is."
                  }
                />
                <Row
                  title="Missions"
                  trailing={
                    <RowValue>
                      {workspace.completedCount}/{workspace.totalCount}
                    </RowValue>
                  }
                />
                <LinkRow
                  href="/build/artifacts"
                  title="Artifacts"
                  detail={
                    workspace.latestArtifact
                      ? `Latest: ${workspace.latestArtifact.title}`
                      : "Nothing produced yet."
                  }
                />
              </>
            ) : (
              <Row
                align="start"
                leading={<Icon name="build" className="size-[1.15rem] text-ink-subtle" />}
                title="Nothing named yet"
                detail="A mission produces something, and that something belongs to a product. Name yours and every artifact you make has somewhere to live."
              />
            )}
          </Group>

          {/* ── How far along ─────────────────────────────────────────────── */}
          <Group
            title="Progress"
            className="rise rise-2"
            action={<LinkText href="/progress">Details</LinkText>}
          >
            <div className="px-4 py-4">
              <Meter
                done={overview.completedLessons}
                total={overview.totalLessons}
                label="Lessons complete"
                showCount={false}
              />
              <p className="mt-2.5 text-subhead text-ink-muted">
                <span className="font-mono tabular-nums text-ink">
                  {overview.completedLessons} of {overview.totalLessons}
                </span>{" "}
                lessons
                {progress.overall?.percent != null ? (
                  <>
                    {" · "}
                    <span className="font-mono tabular-nums">
                      {progress.overall.percent}%
                    </span>{" "}
                    overall
                  </>
                ) : null}
              </p>
            </div>
            <LinkRow
              href="/progress/skills"
              title="Skills"
              detail="What you can do now that you could not do before."
            />
            <LinkRow
              href="/progress/achievements"
              title="Milestones"
              detail="Ground you have actually covered."
            />
          </Group>
        </div>

        {/* ── What happened ───────────────────────────────────────────────── */}
        {activity.length > 0 ? (
          <div className="rise rise-3">
            <ActivityFeed entries={activity} heading="Recent activity" />
          </div>
        ) : null}

        {/*
         * The account, last and quiet. It is not part of the work and does not
         * belong above it — but it is the only place to change a display name,
         * and inventing a settings route for one field would be a worse answer
         * than putting it at the foot of the screen that is already "yours".
         */}
        <Group
          title="Your account"
          footnote={`Signed in as ${profile.role} · member since ${new Date(
            profile.created_at,
          ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}`}
        >
          <div className="px-4 py-4">
            <DisplayNameForm current={profile.display_name} />
          </div>
        </Group>
      </div>
    </Screen>
  );
}

function LinkText({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="tactile text-subhead font-medium text-accent hover:text-accent-hover"
    >
      {children}
    </a>
  );
}
