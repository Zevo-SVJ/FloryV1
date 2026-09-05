import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { Label, Badge } from "@/components/ui/surface";
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
    <div className="space-y-8">
      <RecordView itemId={item.row.id} />

      <PageHeader
        eyebrow={KIND_LABEL[item.row.kind]}
        title={item.row.title}
        description={item.row.summary}
        meta={
          <>
            {item.row.phase_key ? (
              <HeaderMeta label="Phase">{item.row.phase_key}</HeaderMeta>
            ) : null}
            {item.row.tags.length > 0 ? (
              <HeaderMeta label="Tags">{item.row.tags.join(" · ")}</HeaderMeta>
            ) : null}
          </>
        }
        action={<SaveButton itemId={item.row.id} saved={item.saved} path={path} />}
      />

      {item.row.is_demo ? (
        <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
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
          eyebrow="Unreadable"
          tone="danger"
          title="This item could not be read"
          description="Its content does not match the shape its kind expects. Nothing else in the library is affected."
        />
      )}

      {item.related.length > 0 ? (
        <section className="max-w-measure space-y-3">
          <Label>Use it with</Label>
          <ul className="space-y-2">
            {item.related.map((related) => (
              <li key={related.id}>
                <ToolboxItemCard item={related} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.saved ? (
        <p>
          <Badge tone="accent">Saved to your library</Badge>
        </p>
      ) : null}
    </div>
  );
}
