import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Screen } from "@/components/ui/screen";
import { Group } from "@/components/ui/list";
import { Badge } from "@/components/ui/surface";
import { StateBlock } from "@/components/states/state-block";
import { ToolboxItemBody } from "@/components/toolbox/item-body";
import { ToolboxItemCard } from "@/components/toolbox/item-card";
import { RecordView, SaveButton } from "@/components/toolbox/controls";
import { getToolboxItem } from "@/lib/toolbox/queries";
import { KIND_LABEL } from "@/lib/toolbox/schemas";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getToolboxItem(slug);
  return { title: item?.row.title ?? "Toolbox" };
}

/**
 * One Toolbox item, whatever kind it is.
 *
 * A single detail route rather than one per kind. Slugs are unique across the
 * library, the header is identical for all six, and the body is the only part
 * that differs — so six routes would be five copies of a page and one switch
 * moved into the wrong place.
 */
export default async function ToolboxItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getToolboxItem(slug);

  if (!item) notFound();

  const path = `/toolbox/item/${slug}`;

  return (
    <Screen
      title={item.row.title}
      eyebrow={KIND_LABEL[item.row.kind]}
      lede={item.row.summary}
      back={{ href: "/toolbox", label: "Toolbox" }}
      width="read"
      actions={<SaveButton itemId={item.row.id} saved={item.saved} path={path} />}
    >
      <div className="space-y-8">
      <RecordView itemId={item.row.id} />

      {item.row.tags.length > 0 || item.row.phase_key ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote text-ink-subtle">
          {item.row.phase_key ? <span>{item.row.phase_key}</span> : null}
          {item.row.tags.length > 0 ? <span>{item.row.tags.join(" · ")}</span> : null}
        </p>
      ) : null}

      {item.row.is_demo ? (
        <p className="text-footnote text-ink-subtle">
          Demo content, replaced when the curriculum is written.
        </p>
      ) : null}

      {item.parsed ? (
        <ToolboxItemBody
          parsed={item.parsed}
          itemId={item.row.id}
          checkedIds={item.checkedIds}
          path={path}
        />
      ) : (
        /*
         * The body failed its schema. Saying so beats rendering half of it:
         * a Toolbox item that silently drops its "common mistake" section is
         * worse than one that admits it is broken.
         */
        <StateBlock
          as="h2"
          eyebrow="Unreadable"
          tone="danger"
          title="This item could not be read"
          description="Its content does not match the shape its kind expects. Nothing else in the library is affected."
        />
      )}

      {item.related.length > 0 ? (
        <Group title="Use it with">
          {item.related.map((related) => (
            <ToolboxItemCard key={related.id} item={related} />
          ))}
        </Group>
      ) : null}

      {item.saved ? (
        <p>
          <Badge tone="accent">Saved to your library</Badge>
        </p>
      ) : null}
      </div>
    </Screen>
  );
}
