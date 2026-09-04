import type { Metadata } from "next";
import { DisplayNameForm } from "@/components/account/display-name-form";
import { Card, Label } from "@/components/ui/surface";
import { requireProfile } from "@/lib/auth/dal";
import { PHASES } from "@/lib/lock/phases";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The dashboard.
 *
 * Two things, and both are true today: the shape of the program, and the
 * account. There is no progress bar, no streak and no "next lesson", because
 * there are no lessons — a dashboard of invented numbers would make the
 * platform look finished and make every later prompt harder, since the next
 * person would have to work out which parts were real.
 *
 * The phase map is not a placeholder. The ten phases are the program, they are
 * fixed, and seeing the whole route before starting it is the point. What is
 * missing is the record of where somebody is on it, and the page says so once,
 * plainly.
 */
export default async function DashboardPage() {
  const profile = await requireProfile();
  const name = profile.display_name?.trim();

  return (
    <div className="space-y-12 pb-16">
      <section className="space-y-3">
        <h1 className="text-display">{name ? `Welcome, ${name}.` : "Welcome."}</h1>
        <p className="text-lede max-w-measure text-ink-muted">
          You are the founder. The tools are the execution layer. Your job is to think,
          decide, direct, build, verify, ship and operate.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>The program</Label>
          <p className="text-sm text-ink-subtle">
            Progress is not tracked yet — the learning engine arrives in Prompt 3.
          </p>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2">
          {PHASES.map((phase) => (
            <li key={phase.key}>
              <Card className="flex h-full gap-4 p-4">
                <span className="label pt-0.5 text-ink-subtle tabular-nums">
                  {String(phase.number).padStart(2, "0")}
                </span>
                <div className="space-y-1">
                  <p className="font-medium">{phase.label}</p>
                  <p className="text-sm text-ink-muted">{phase.summary}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-measure space-y-4">
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
