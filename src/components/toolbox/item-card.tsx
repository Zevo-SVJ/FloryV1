import Link from "next/link";
import type { ToolboxItemRow } from "@/types/database";
import { Badge } from "@/components/ui/surface";
import { Group, LinkRow } from "@/components/ui/list";
import { Icon, type IconName } from "@/components/ui/icon";
import { KIND_LABEL } from "@/lib/toolbox/schemas";

/**
 * One item in a list, and in search results.
 *
 * The kind leads — in a mixed result set the first question is "what sort of
 * thing is this?" — but as an icon rather than as a word, because six repeated
 * uppercase category labels down a list is six words the eye has to read before
 * it reaches the titles it came for. The summary answers "what is it" without
 * opening it, which is why the schema makes that column required.
 */
const KIND_ICON: Record<ToolboxItemRow["kind"], IconName> = {
  prompt: "sparkle",
  template: "note",
  framework: "learn",
  checklist: "check",
  resource: "play",
  stack_tool: "build",
};

export function ToolboxItemCard({
  item,
  showKind = true,
}: {
  item: ToolboxItemRow;
  showKind?: boolean;
}) {
  return (
    <LinkRow
      href={`/toolbox/item/${item.slug}`}
      align="start"
      leading={
        showKind ? (
          <Icon
            name={KIND_ICON[item.kind]}
            title={KIND_LABEL[item.kind]}
            className="size-[1.15rem] text-ink-subtle"
          />
        ) : undefined
      }
      title={
        <span className="flex flex-wrap items-baseline gap-x-2.5">
          <span>{item.title}</span>
          {item.is_demo ? <Badge>Demo</Badge> : null}
        </span>
      }
      detail={item.summary}
    />
  );
}

/**
 * "Tools for this step", beside a lesson or a mission.
 *
 * The reason the join tables exist. A learner should never have to work out
 * which item from a growing library applies to the thing in front of them —
 * the curriculum states it, and this renders it where the work is happening.
 */
export function ContextualTools({
  items,
  heading = "Tools for this step",
}: {
  items: ToolboxItemRow[];
  heading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Group title={heading}>
      {items.map((item) => (
        <ToolboxItemCard key={item.id} item={item} />
      ))}
    </Group>
  );
}

/** A link out of a list into the wider library. Used under a short result set. */
export function MoreInToolbox({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="tactile text-subhead font-medium text-accent hover:text-accent-hover"
    >
      {label}
    </Link>
  );
}
