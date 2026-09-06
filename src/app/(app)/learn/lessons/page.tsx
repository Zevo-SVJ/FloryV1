import type { Metadata } from "next";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow } from "@/components/ui/list";
import { StatusMark } from "@/components/ui/icon";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getLearningOverview } from "@/lib/learning/overview";
import { getLearningState } from "@/lib/learning/queries";
import { lessonTypeLabel } from "@/lib/learning/labels";

export const metadata: Metadata = { title: "Every lesson" };

/**
 * Every lesson, for when you are looking for one specific thing.
 *
 * A secondary index, and it says so. It used to be one of three learning
 * destinations in the sidebar, which made a learner choose between the roadmap,
 * the lessons and the missions before they could start. Learn is that route now.
 *
 * This still exists and is still linked from Learn, because "where was that
 * lesson about interviews" is a real question and hunting through modules is a
 * poor answer to it. It is a reference, not a place to begin — which is why it
 * is a flat list grouped by module, with no progress device of its own.
 */
export default async function LessonsPage() {
  const [overview, state] = await Promise.all([getLearningOverview(), getLearningState()]);
  const { phases, nextLesson, completedLessons, totalLessons } = overview;
  const published = phases.filter((phase) => phase.published);

  return (
    <Screen
      title="Every lesson"
      eyebrow="Index"
      back={{ href: "/learn", label: "Learn" }}
      width="content"
      lede="The complete index, for finding one specific thing. To work through the programme in order, go to Learn."
    >
      <div className="space-y-8">
        {published.length === 0 ? (
          <Group>
            <EmptyState
              title="No lessons are open yet"
              action={<ButtonLink href="/learn" size="sm">Go to Learn</ButtonLink>}
            >
              Learn shows the ten phases the curriculum is being written into.
            </EmptyState>
          </Group>
        ) : null}

        {published.map((phase) =>
          phase.modules
            .filter((entry) => entry.lessons.length > 0)
            .map((entry) => (
              <Group
                key={entry.module.id}
                title={
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono tabular-nums">
                      {String(phase.number).padStart(2, "0")}
                    </span>
                    <span>{phase.label}</span>
                    <span aria-hidden className="opacity-40">·</span>
                    <span className="normal-case">{entry.module.title}</span>
                  </span>
                }
              >
                {entry.lessons.map((lesson, index) => {
                  const done = state.completedLessonIds.has(lesson.id);
                  const next = nextLesson?.lesson.id === lesson.id;
                  return (
                    <LinkRow
                      key={lesson.id}
                      href={`/learn/lessons/${lesson.slug}`}
                      align="start"
                      leading={
                        <StatusMark
                          state={done ? "done" : next ? "current" : "todo"}
                          index={done || next ? undefined : index + 1}
                        />
                      }
                      title={lesson.title}
                      detail={lesson.summary}
                      trailing={
                        <span className="hidden text-right sm:block">
                          <span className="block">{lessonTypeLabel(lesson.type)}</span>
                          <span className="mt-0.5 block font-mono tabular-nums">
                            {lesson.estimatedMinutes} min
                          </span>
                        </span>
                      }
                    />
                  );
                })}
              </Group>
            )),
        )}

        {totalLessons > 0 ? (
          <p className="px-1 text-footnote text-ink-subtle">
            <span className="font-mono tabular-nums">
              {completedLessons} of {totalLessons}
            </span>{" "}
            complete. Lessons marked demo exist to prove the learning engine runs
            end to end; the curriculum itself is written in a later phase.
          </p>
        ) : null}
      </div>
    </Screen>
  );
}
