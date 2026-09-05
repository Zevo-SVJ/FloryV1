import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label } from "@/components/ui/surface";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Roadmap } from "@/components/lock/roadmap";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { requireProfile } from "@/lib/auth/dal";
import { buildRoadmap } from "@/lib/lock/roadmap";
import { PHASES } from "@/lib/lock/phases";

export const metadata: Metadata = { title: "Home" };

/**
 * The command centre, laid out before there is anything to command.
 *
 * This page will eventually answer six questions at a glance: where am I, what
 * do I do next, how far have I come, what am I building, what happened
 * recently, what is the next milestone. Every one of those blocks is drawn
 * here, in the position it will keep — and every one says plainly that it has
 * no data rather than showing a number somebody made up.
 *
 * That restraint is the design. A dashboard of invented progress would look
 * finished today and cost Prompt 3 a week of working out which figures were
 * real. The blocks are the deliverable; the data is Prompt 3's.
 *
 * The roadmap is shown truncated to the first four phases — enough to orient
 * somebody without turning the home page into the roadmap page, which is one
 * click away.
 */
export default async function HomePage() {
  const profile = await requireProfile();
  const name = profile.display_name?.trim();
  const phases = buildRoadmap(null);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title={name ? `Welcome, ${name}.` : "Welcome."}
        description="You are the founder. The tools are the execution layer. Your job is to think, decide, direct, build, verify, ship and operate."
        meta={
          <>
            <HeaderMeta label="Phase">Not started</HeaderMeta>
            <HeaderMeta label="Missions done">0</HeaderMeta>
            <HeaderMeta label="Artifacts">0</HeaderMeta>
          </>
        }
      />

      {/* What to do next, and how far along. The two questions somebody opens a
          dashboard to answer. */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-3">
          <Label>Next action</Label>
          <EmptyState title="Nothing to do here yet" className="h-full">
            <p>
              When the lessons land, this is the single next thing worth doing —
              one action, not a list. Until then, the roadmap is the useful
              place to start: it shows the whole route before you take it.
            </p>
            <p className="pt-3">
              <ButtonLink href="/learn" size="sm">
                See the roadmap
              </ButtonLink>
            </p>
          </EmptyState>
        </section>

        <section className="space-y-3">
          <Label>Progress</Label>
          <Card className="flex h-full flex-col justify-between gap-6 p-5">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">Phases complete</span>
                <span className="font-mono text-sm tabular-nums text-ink">
                  0 / {PHASES.length}
                </span>
              </div>
              <ProgressBar value={null} max={PHASES.length} label="Phases complete" />
            </div>

            <p className="text-sm text-ink-subtle">
              Nothing is tracked yet. Progress starts being recorded when
              missions can be completed.
            </p>
          </Card>
        </section>
      </div>

      {/* The route. Truncated deliberately — the whole thing lives one click away. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Label>Roadmap</Label>
          <Link
            href="/learn"
            className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
          >
            All ten phases
          </Link>
        </div>
        <Card className="p-2 sm:p-4">
          <Roadmap phases={phases.slice(0, 4)} />
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <Label>Your SaaS</Label>
          <EmptyState title="No product yet">
            <p>
              The early phases decide what you are building and for whom. Once
              they do, its name and current state show here.
            </p>
            <p className="pt-3">
              <ButtonLink href="/build" variant="secondary" size="sm">
                Open My SaaS
              </ButtonLink>
            </p>
          </EmptyState>
        </section>

        <section className="space-y-3">
          <Label>Recent activity</Label>
          <EmptyState title="Nothing has happened yet">
            <p>
              Completed missions, submitted work and mentor feedback appear here
              as they happen, newest first.
            </p>
          </EmptyState>
        </section>
      </div>

      <section className="space-y-3">
        <Label>Milestones</Label>
        <EmptyState title="No milestones reached">
          <p>
            Milestones mark real ground — a validated problem, a deployed build,
            a first paying customer. They are earned by work, not by opening
            pages, so none of them are showing.
          </p>
        </EmptyState>
      </section>

      <section className="max-w-measure space-y-3">
        <Label>Your account</Label>
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
