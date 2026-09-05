import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Badge, Card, Label } from "@/components/ui/surface";
import { getCurriculum, getLearningState } from "@/lib/learning/queries";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Lessons" };

/**
 * Every lesson, in the order the program runs.
 *
 * Grouped by phase and module rather than listed flat, because the hierarchy is
 * the argument: a lesson means something because of where it sits. A phase with
 * no published modules is drawn anyway, greyed, so the shape of what is coming
 * stays visible.
 */
export default async function LessonsPage() {
  const [curriculum, state] = await Promise.all([getCurriculum(), getLearningState()]);
  const lessonCount = curriculum.reduce(
    (total, phase) => total + phase.modules.reduce((n, module) => n + module.lessons.length, 0),
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learn"
        title="Lessons"
        description="The teaching inside each phase. You do them in order — each one is the input to the next."
        meta={
          <>
            <HeaderMeta label="Published">{lessonCount}</HeaderMeta>
            <HeaderMeta label="Completed">{state.completedLessonIds.size}</HeaderMeta>
            <HeaderMeta label="To revisit">{state.revisitLessonIds.size}</HeaderMeta>
          </>
        }
      />

      {lessonCount === 0 ? (
        <EmptyState title="No lessons published yet">
          <p>
            The engine is built and the curriculum is written separately, so that
            the teaching is designed rather than improvised around the software.
            Lessons appear here as they are published.
          </p>
        </EmptyState>
      ) : null}

      <div className="space-y-10">
        {curriculum.map(({ phase, modules }) => (
          <section key={phase.key} className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="label text-ink-subtle tabular-nums">
                {String(phase.position).padStart(2, "0")}
              </span>
              <h2 className="text-[1.0625rem] font-medium text-ink">{phase.label}</h2>
              <p className="text-sm text-ink-subtle">{phase.summary}</p>
            </div>

            {modules.length === 0 ? (
              <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
                No modules published in this phase yet.
              </p>
            ) : (
              modules.map(({ module, lessons }) => (
                <div key={module.id} className="space-y-2">
                  <Label>{module.title}</Label>

                  <ul className="space-y-2">
                    {lessons.map((lesson) => {
                      const done = state.completedLessonIds.has(lesson.id);
                      const revisit = state.revisitLessonIds.has(lesson.id);

                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/learn/lessons/${lesson.slug}`}
                            className="block rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                              <span
                                aria-hidden
                                className={cn(
                                  "mt-1.5 size-2 shrink-0 rounded-full",
                                  done ? "bg-success" : "bg-border-strong",
                                )}
                              />
                              <span className="text-[0.9375rem] font-medium text-ink">
                                {lesson.title}
                              </span>
                              <span className="label text-ink-subtle">{lesson.type}</span>
                              <span className="label text-ink-subtle tabular-nums">
                                {lesson.estimatedMinutes} min
                              </span>
                              {done ? <Badge>Completed</Badge> : null}
                              {revisit ? <Badge tone="accent">Revisit</Badge> : null}
                              {lesson.isDemo ? <Badge>Demo</Badge> : null}
                            </div>
                            <p className="mt-2 max-w-measure text-sm text-ink-muted">
                              {lesson.summary}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>
        ))}
      </div>

      <Card className="border-dashed bg-transparent p-4">
        <p className="text-sm text-ink-subtle">
          Content marked <span className="text-ink">Demo</span> exists to prove the
          learning engine runs end to end. The curriculum itself is written in a
          later phase, and the demo rows are removed with one statement when it
          lands.
        </p>
      </Card>
    </div>
  );
}
