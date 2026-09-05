import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Label } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { AwardCard } from "@/components/progress/award";
import { getAwards } from "@/lib/progress/queries";

export const metadata: Metadata = { title: "Achievements" };

/**
 * Milestones and achievements, earned and not.
 *
 * Two sections rather than two systems: the same table, the same evaluator and
 * the same earning path sit behind both, and `kind` decides only which heading
 * a row appears under. Milestones are where you are on the journey;
 * achievements are firsts worth recognising. Building two of everything for
 * that distinction would have been two places to get the security wrong.
 *
 * Unearned rows are drawn dimmed rather than hidden. A page showing only what
 * somebody already has tells them nothing about what the program is asking of
 * them next — this way it reads as a map.
 *
 * There is no leaderboard and no comparison to anybody. LOCK has one learner
 * and the ranking would be against themselves.
 */
export default async function AchievementsPage() {
  const awards = await getAwards();

  const milestones = awards.definitions.filter((award) => award.kind === "milestone");
  const achievements = awards.definitions.filter((award) => award.kind === "achievement");
  const earnedCount = awards.earned.size;
  const manual = awards.definitions.filter((award) => award.requirement === "manual").length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Progress"
        title="Milestones"
        description="Ground you have actually covered. Every one of these is earned by something that happened — a project named, work approved, a build deployed — and none of them by opening a page."
        meta={
          <>
            <HeaderMeta label="Earned">{earnedCount}</HeaderMeta>
            <HeaderMeta label="Total">{awards.definitions.length}</HeaderMeta>
            <HeaderMeta label="Milestones">{milestones.length}</HeaderMeta>
            <HeaderMeta label="Achievements">{achievements.length}</HeaderMeta>
          </>
        }
      />

      {earnedCount === 0 ? (
        <EmptyState title="Your first milestone is waiting">
          <p>
            The first one is First Idea, and it is earned the moment you name
            what you are building. Everything below it is drawn already, so you
            can see the shape of the journey before you have taken any of it.
          </p>
          <p className="pt-3">
            <ButtonLink href="/build" size="sm">
              Start my SaaS
            </ButtonLink>
          </p>
        </EmptyState>
      ) : null}

      <section className="space-y-3">
        <Label>The journey</Label>
        <div className="grid gap-4 md:grid-cols-2">
          {milestones.map((award) => (
            <AwardCard key={award.key} award={award} earned={awards.earned.get(award.key)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Label>Firsts</Label>
        <div className="grid gap-4 md:grid-cols-2">
          {achievements.map((award) => (
            <AwardCard key={award.key} award={award} earned={awards.earned.get(award.key)} />
          ))}
        </div>
      </section>

      <p className="max-w-measure text-sm text-ink-subtle">
        {manual} of these say &ldquo;mentor confirms&rdquo;. LOCK has no analytics
        and no billing integration, so it genuinely cannot see a real user or a
        real payment — and a checkbox you tick yourself would not be evidence of
        either. Your mentor looks and says so, and the record shows who did.
      </p>
    </div>
  );
}
