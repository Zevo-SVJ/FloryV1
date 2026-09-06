import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { LessonRow } from "@/components/learning/hierarchy";
import { getLearningOverview, getModuleBySlug } from "@/lib/learning/overview";
import { getLearningState } from "@/lib/learning/queries";
import { MISSION_TYPE_LABEL } from "@/lib/workspace/labels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await getModuleBySlug(slug);
  return { title: found?.module?.module.title ?? "Module" };
}

/**
 * A module, with its own page.
 *
 * This route is new, and it is the one structural addition the redesign makes.
 * The hierarchy the product is built on runs Phase → Module → Lesson →
 * Mission, and the module level had no surface at all: it existed as a small
 * grey label above a list of lessons, which is why the interface read as a flat
 * library. A unit of work that produces something deserves a page that says
 * what it teaches, what it costs and what it ends in.
 *
 * The order is the argument: what you will be able to do, then the lessons in
 * sequence, then the mission that applies them. Learn → do → produce.
 */
export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = await getModuleBySlug(slug);
  if (!found) notFound();

  // The module exists but is not published for this reader.
  if (!found.module || !found.phase) {
    return (
      <StateBlock
        eyebrow="Not published"
        title="This module is still being written"
        description="It exists, but it is not open yet. The roadmap shows what is available now."
        actions={<ButtonLink href="/learn" size="sm">Back to the roadmap</ButtonLink>}
      />
    );
  }

  const { phase, module: entry } = found;
  const [state, overview] = await Promise.all([getLearningState(), getLearningOverview()]);

  const index = phase.modules.findIndex((m) => m.module.id === entry.module.id);
  const complete = entry.lessons.length > 0 && entry.lessonsDone === entry.lessons.length;

  return (
    <div className="space-y-12">
      {/* ── Where this sits ──────────────────────────────────────────────── */}
      <header className="space-y-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href="/learn" className="label text-ink-subtle transition-colors hover:text-ink">
            Roadmap
          </Link>
          <span aria-hidden className="label text-border-strong">/</span>
          <span className="label text-ink-subtle">
            {String(phase.number).padStart(2, "0")} {phase.label}
          </span>
          <span aria-hidden className="label text-border-strong">/</span>
          <span className="label text-ink-muted">
            Module {String(index + 1).padStart(2, "0")}
          </span>
        </nav>

        <div className="space-y-2">
          <h1 className="text-display max-w-measure text-balance">{entry.module.title}</h1>
          {entry.module.summary ? (
            <p className="max-w-measure text-lede text-ink-muted">{entry.module.summary}</p>
          ) : null}
        </div>

        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border py-3">
          <Fact label="Lessons">
            <span className="tabular-nums">
              {entry.lessonsDone}/{entry.lessons.length}
            </span>
          </Fact>
          {entry.missions.length > 0 ? (
            <Fact label="Mission">{entry.missions.length}</Fact>
          ) : null}
          <Fact label="Time">
            <span className="tabular-nums">~{entry.minutes} min</span>
          </Fact>
          <Fact label="Status">
            {complete ? "Complete" : entry.lessonsDone > 0 ? "In progress" : "Not started"}
          </Fact>
        </dl>
      </header>

      {/* ── The work ─────────────────────────────────────────────────────── */}
      <section className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
          <h2 className="label text-ink-subtle">Lessons</h2>
          {entry.nextLesson ? (
            <ButtonLink href={`/learn/lessons/${entry.nextLesson.slug}`} size="sm">
              {entry.lessonsDone > 0 ? "Continue" : "Start"}
            </ButtonLink>
          ) : null}
        </div>

        {entry.lessons.length === 0 ? (
          <p className="py-6 text-sm text-ink-subtle">
            The lessons for this module are being written.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {entry.lessons.map((lesson, i) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={i + 1}
                done={state.completedLessonIds.has(lesson.id)}
                revisit={state.revisitLessonIds.has(lesson.id)}
                next={entry.nextLesson?.id === lesson.id}
              />
            ))}
          </ol>
        )}
      </section>

      {/* ── What it ends in ──────────────────────────────────────────────── */}
      {entry.missions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="label border-b border-border pb-2 text-ink-subtle">
            Then apply it
          </h2>
          {entry.missions.map(({ mission, progress }) => (
            <div key={mission.id} className="rounded-card border-l-2 border-accent bg-accent-quiet/25 p-5">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="label text-accent">{MISSION_TYPE_LABEL[mission.type]}</span>
                <span className="label tabular-nums text-ink-subtle">
                  {mission.estimated_minutes} min
                </span>
                {progress?.status === "completed" ? (
                  <span className="label text-ink-subtle">Complete</span>
                ) : null}
              </p>
              <h3 className="mt-1.5 text-[1.0625rem] font-medium tracking-tight text-ink">
                {mission.title}
              </h3>
              <p className="mt-1 max-w-measure text-sm leading-relaxed text-ink-muted">
                {mission.objective}
              </p>
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <ButtonLink href={`/learn/missions/${mission.slug}`} size="sm">
                  Open the mission
                </ButtonLink>
                <span className="text-sm text-ink-subtle">
                  Produces <span className="text-ink-muted">{mission.deliverable_title}</span>
                </span>
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {/* ── What comes after ─────────────────────────────────────────────── */}
      <NextModule
        phase={phase}
        index={index}
        overallNext={overview.nextLesson?.lesson.slug ?? null}
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="label text-ink-subtle">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Where the sequence goes next. A module that ends in nothing reads as a dead end. */
function NextModule({
  phase,
  index,
  overallNext,
}: {
  phase: NonNullable<Awaited<ReturnType<typeof getModuleBySlug>>>["phase"];
  index: number;
  overallNext: string | null;
}) {
  if (!phase) return null;
  const next = phase.modules[index + 1];

  if (next) {
    return (
      <section className="border-t border-border pt-5">
        <p className="label text-ink-subtle">Next in {phase.label}</p>
        <Link
          href={`/learn/modules/${next.module.slug}`}
          className="mt-1 block text-[1.0625rem] font-medium tracking-tight text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
        >
          {next.module.title}
        </Link>
      </section>
    );
  }

  return (
    <section className="border-t border-border pt-5">
      <p className="label text-ink-subtle">Last module in {phase.label}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {overallNext ? (
          <Link
            href="/learn"
            className="underline decoration-border-strong underline-offset-4 hover:text-ink"
          >
            Back to the roadmap
          </Link>
        ) : (
          "The next phase opens when its content is published."
        )}
      </p>
    </section>
  );
}
