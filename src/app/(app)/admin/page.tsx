import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Card, Label, Badge } from "@/components/ui/surface";
import { Forbidden } from "@/components/states/forbidden";
import { checkAccess, requireSection } from "@/lib/lock/access";
import { createClient } from "@/lib/supabase/server";
import { getAssignedLearners } from "@/lib/mentor/queries";

export const metadata: Metadata = { title: "Admin" };

/**
 * Administration, as a foundation rather than a console.
 *
 * What exists here is the operational picture — who holds which role, who is
 * paired with whom, how much content is published. What deliberately does not
 * exist is editing: content is authored with SQL, and a half-built CMS is worse
 * than none because it invites people to use it for the things it cannot do.
 *
 * Prompt 7 decides whether content editing belongs in the product at all. Until
 * then this page answers the questions an administrator actually has, and the
 * SQL for the two operations that matter is on the page rather than in a
 * document nobody opens.
 */
export default async function AdminPage() {
  const section = requireSection("/admin");
  const { profile, allowed } = await checkAccess(section.access);
  if (!allowed) return <Forbidden role={profile.role} />;

  const supabase = await createClient();

  const [profiles, relationships, lessons, missions, toolbox, learners] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("learner_mentor_relationships").select("*"),
    supabase.from("lessons").select("id,published"),
    supabase.from("missions").select("id,published"),
    supabase.from("toolbox_items").select("id,published"),
    getAssignedLearners(),
  ]);

  const accounts = profiles.data ?? [];
  const published = <T extends { published: boolean }>(rows: T[] | null) =>
    `${(rows ?? []).filter((row) => row.published).length} / ${(rows ?? []).length}`;

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
        <Label>Published content</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="space-y-1 p-4">
            <p className="label text-ink-subtle">Lessons</p>
            <p className="font-mono text-sm tabular-nums text-ink">{published(lessons.data)}</p>
          </Card>
          <Card className="space-y-1 p-4">
            <p className="label text-ink-subtle">Missions</p>
            <p className="font-mono text-sm tabular-nums text-ink">{published(missions.data)}</p>
          </Card>
          <Card className="space-y-1 p-4">
            <p className="label text-ink-subtle">Toolbox</p>
            <p className="font-mono text-sm tabular-nums text-ink">{published(toolbox.data)}</p>
          </Card>
        </div>
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
