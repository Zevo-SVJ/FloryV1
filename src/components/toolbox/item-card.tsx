import Link from "next/link";
import { Badge } from "@/components/ui/surface";
import { KIND_LABEL } from "@/lib/toolbox/schemas";
import type { ToolboxItemRow } from "@/types/database";

/**
 * One item in a list, and in search results.
 *
 * Leads with the kind, because the first question in a mixed result set is
 * "what sort of thing is this?". The summary answers "what is it" without
 * opening it — which is why the schema makes that column required and long
 * enough to say something.
 */
export function ToolboxItemCard({
  item,
  showKind = true,
}: {
  item: ToolboxItemRow;
  showKind?: boolean;
}) {
  return (
    <Link
      href={`/toolbox/item/${item.slug}`}
      className="block rounded-card border border-border p-4 transition-colors hover:border-border-strong hover:bg-surface-sunken"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {showKind ? <span className="label text-ink-subtle">{KIND_LABEL[item.kind]}</span> : null}
        <span className="text-[0.9375rem] font-medium text-ink">{item.title}</span>
        {item.is_demo ? <Badge>Demo</Badge> : null}
      </div>
      <p className="mt-1.5 max-w-measure text-sm text-ink-muted">{item.summary}</p>
      {item.tags.length > 0 ? (
        <p className="mt-2 flex flex-wrap gap-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="label text-ink-subtle">
              {tag}
            </span>
          ))}
        </p>
      ) : null}
    </Link>
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
    <section className="max-w-measure space-y-3">
      <p className="label text-ink-subtle">{heading}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <ToolboxItemCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
