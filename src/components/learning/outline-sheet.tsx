"use client";

import { Sheet } from "@/components/ui/sheet";
import { Icon } from "@/components/ui/icon";
import { OutlineList, type OutlineLesson } from "@/components/learning/course";
import { cn } from "@/lib/utils/cn";

/**
 * The lesson outline, on demand.
 *
 * A toolbar control and a sheet, at every width. It used to be a permanent
 * third column above `xl`, which put a table of contents beside the thing the
 * learner came to read and left a dead column at every width in between.
 *
 * One behaviour on a phone and on a Mac is the point: the control is in the
 * same place, the list is the same list, and the reading column is never
 * competing with navigation for attention. The count on the button means it
 * still answers "how far through this module am I" without being opened.
 */
export function OutlineSheet({
  moduleTitle,
  moduleHref,
  lessons,
  currentId,
  missionTitle,
}: {
  moduleTitle: string;
  moduleHref: string;
  lessons: readonly OutlineLesson[];
  currentId: string;
  missionTitle?: string | null;
}) {
  const done = lessons.filter((lesson) => lesson.done).length;

  return (
    <Sheet
      title={moduleTitle}
      trigger={({ onClick, "aria-expanded": expanded }) => (
        <button
          type="button"
          onClick={onClick}
          aria-expanded={expanded}
          aria-haspopup="dialog"
          className={cn(
            "tactile flex h-11 items-center gap-2 rounded-pill px-3 sm:h-9",
            "text-subhead text-ink-muted hover:bg-ink/[0.06] hover:text-ink",
          )}
        >
          <Icon name="list" className="size-[1.05rem]" />
          <span className="font-mono text-footnote tabular-nums">
            {done}/{lessons.length}
          </span>
          <span className="sr-only">Lessons in this module</span>
        </button>
      )}
    >
      <OutlineList
        moduleTitle={moduleTitle}
        moduleHref={moduleHref}
        lessons={lessons}
        currentId={currentId}
        missionTitle={missionTitle}
      />
    </Sheet>
  );
}
