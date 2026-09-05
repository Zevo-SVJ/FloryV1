import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { Forbidden } from "@/components/states/forbidden";
import { checkAccess, requireSection } from "@/lib/lock/access";
import { createClient } from "@/lib/supabase/server";
import { getAssignedLearners } from "@/lib/mentor/queries";
import { getXpRules } from "@/lib/progress/queries";
import {
  CONTENT_STATUS_LABEL,
  SKILL_AREA_LABEL,
  XP_EVENT_LABEL,
  AWARD_KIND_LABEL,
} from "@/lib/progress/labels";
import type { ContentStatus } from "@/types/database";

/** Draft first, archived last — the order content moves through. */
const CONTENT_STATUSES: readonly ContentStatus[] = [
  "draft",
  "review",
  "published",
  "archived",
] as const;

export const metadata: Metadata = { title: "Admin" };

/**
 * Administration, as a foundation rather than a console.
 *
 * What exists here is the operational picture — who holds which role, who is
 * paired with whom, how much content is published. What deliberately does not
 * exist is editing: content is authored with SQL, and a half-built CMS is worse
 * than none because it invites people to use it for the things it cannot do.
 *
 * Prompt 7 asked whether content editing belongs here and the answer is still
 * no. What it added instead is visibility of the *definitions* — skills,
 * milestones and XP rules — because an administrator needs to know what the
 * progress system is scoring before they can reason about a learner's numbers.
 * Reading them is useful; a form for editing them would be a CMS with three
 * tables and no versioning.
 *
 * Content lifecycle is now shown as four states rather than a published count,
 * since that is the thing an administrator actually watches while a curriculum
 * is being written.
 */
export default async function AdminPage() {
  const section = requireSection("/admin");
  const { profile, allowed } = await checkAccess(section.access);
  if (!allowed) return <Forbidden role={profile.role} />;

  const supabase = await createClient();

  const [profiles, relationships, lessons, missions, toolbox, learners, skills, milestones, xpRules] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("learner_mentor_relationships").select("*"),
      supabase.from("lessons").select("id,status"),
      supabase.from("missions").select("id,status"),
      supabase.from("toolbox_items").select("id,status"),
      getAssignedLearners(),
      supabase.from("skills").select("*").order("area").order("position"),
      supabase.from("milestones").select("*").order("position"),
      getXpRules(),
    ]);

  const accounts = profiles.data ?? [];

  /*
   * Four counts rather than one fraction. "12 / 40 published" hides the
   * question an administrator has while a curriculum is being written, which
   * is how much is drafted and how much is waiting to be read.
   */
  const byStatus = <T extends { status: ContentStatus }>(rows: T[] | null) => {
    const all = rows ?? [];
    return CONTENT_STATUSES.map((status) => ({
      status,
      count: all.filter((row) => row.status === status).length,
    })).filter((entry) => entry.count > 0);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Staff"
        title="Admin"
        description="Who has access, who reviews whom, and what is published. Content itself is authored with SQL — see below."
        meta={
          <>
            <HeaderMeta label="Accounts">{accounts.length}</HeaderMeta>
            <HeaderMeta label="Learners">{learners.length}</HeaderMeta>
            <HeaderMeta label="Pairings">{(relationships.data ?? []).length}</HeaderMeta>
          </>
        }
      />

      <section className="space-y-3">
        <Label>Accounts</Label>
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-border p-4"
            >
              <span className="text-[0.9375rem] text-ink">
                {account.display_name ?? "Unnamed account"}
              </span>
              <Badge tone={account.role === "learner" ? "quiet" : "accent"}>{account.role}</Badge>
              <span className="label text-ink-subtle tabular-nums">
                since{" "}
                {new Date(account.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </span>
              {learners.some((entry) => entry.learner.id === account.id) ? (
                <Link
                  href={`/review/learners/${account.id}`}
                  className="text-sm text-ink underline decoration-border-strong underline-offset-4"
                >
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <Label>Content lifecycle</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Lessons", rows: lessons.data },
            { label: "Missions", rows: missions.data },
            { label: "Toolbox", rows: toolbox.data },
          ].map(({ label, rows }) => {
            const counts = byStatus(rows);
            return (
              <Card key={label} className="space-y-2 p-4">
                <p className="label text-ink-subtle">{label}</p>
                {counts.length === 0 ? (
                  <p className="text-sm text-ink-subtle">Nothing authored yet</p>
                ) : (
                  <dl className="space-y-1 text-sm">
                    {counts.map(({ status, count }) => (
                      <div key={status} className="flex items-baseline justify-between gap-3">
                        <dt className="text-ink-muted">{CONTENT_STATUS_LABEL[status]}</dt>
                        <dd className="font-mono tabular-nums text-ink">{count}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Card>
            );
          })}
        </div>
        <p className="max-w-measure text-sm text-ink-subtle">
          A row&rsquo;s status is the authoritative column and its published
          flag is generated from it, so the two cannot disagree. Set the status;
          the visibility follows.
        </p>
      </section>

      {/* The definitions the progress system scores against. Read-only, and
          that is the decision rather than an omission. */}
      <section className="space-y-3">
        <Label>Progress definitions</Label>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-5">
            <p className="text-sm font-medium text-ink">
              Skills · {(skills.data ?? []).length}
            </p>
            <dl className="space-y-1 text-sm">
              {Object.entries(
                (skills.data ?? []).reduce<Record<string, number>>((acc, skill) => {
                  acc[skill.area] = (acc[skill.area] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([area, count]) => (
                <div key={area} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-muted">
                    {SKILL_AREA_LABEL[area as keyof typeof SKILL_AREA_LABEL]}
                  </dt>
                  <dd className="font-mono tabular-nums text-ink">{count}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="space-y-3 p-5">
            <p className="text-sm font-medium text-ink">
              Milestones · {(milestones.data ?? []).length}
            </p>
            <dl className="space-y-1 text-sm">
              {(["milestone", "achievement"] as const).map((kind) => (
                <div key={kind} className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-muted">{AWARD_KIND_LABEL[kind]}</dt>
                  <dd className="font-mono tabular-nums text-ink">
                    {(milestones.data ?? []).filter((row) => row.kind === kind).length}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1">
                <dt className="text-ink-muted">Awarded by a mentor</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {(milestones.data ?? []).filter((row) => row.requirement === "manual").length}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-medium text-ink">XP rules</p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {xpRules.map((rule) => (
              <div key={rule.kind} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">{XP_EVENT_LABEL[rule.kind]}</dt>
                <dd className="font-mono tabular-nums text-ink">{rule.amount}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-ink-subtle">
            Amounts live in public.xp_rules. Changing one takes effect on the
            next event and never rewrites XP already awarded — the ledger is a
            record of what was paid at the time.
          </p>
        </Card>
      </section>

      <section className="max-w-measure space-y-3">
        <Label>Operations</Label>
        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Pair a learner with a mentor</p>
            <pre className="overflow-x-auto rounded-control bg-surface-sunken p-3 font-mono text-[0.75rem] text-ink-muted">
{`insert into public.learner_mentor_relationships (learner_id, mentor_id)
values ('<learner uuid>', '<mentor uuid>');`}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Change a role</p>
            <pre className="overflow-x-auto rounded-control bg-surface-sunken p-3 font-mono text-[0.75rem] text-ink-muted">
{`update public.profiles set role = 'mentor'
where id = (select id from auth.users where email = 'you@example.com');`}
            </pre>
            <p className="text-sm text-ink-subtle">
              Not writable through the API at any privilege level, including
              this one. That has been true since Foundation and is deliberate.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
