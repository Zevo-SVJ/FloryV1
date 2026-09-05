import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { ToolboxItemCard } from "@/components/toolbox/item-card";
import { getToolboxItems } from "@/lib/toolbox/queries";
import type { ToolboxKind } from "@/lib/toolbox/schemas";

/**
 * One category listing, shared by every Toolbox section.
 *
 * Six near-identical pages would be six places for a heading to drift. The
 * pages themselves are five lines each and say only what makes them different.
 *
 * `resourceKind` narrows within the `resource` kind, which is how the Resources
 * section splits into Videos, Docs and References without a second table or a
 * second navigation entry — the library is one library, and those routes are
 * views onto it.
 */
export async function ToolboxCategory({
  kind,
  eyebrow,
  title,
  description,
  resourceKind,
}: {
  kind: ToolboxKind;
  eyebrow: string;
  title: string;
  description: string;
  resourceKind?: "video" | "article" | "doc" | "tool" | "book" | "reference";
}) {
  const all = await getToolboxItems(kind);

  const items = resourceKind
    ? all.filter((item) => {
        if (item.parsed?.kind !== "resource") return false;
        const actual = item.parsed.body.resourceKind;
        /* "Reference" is the catch-all: anything that is not a video and not
           documentation still belongs somewhere findable. */
        return resourceKind === "reference"
          ? actual !== "video" && actual !== "doc"
          : actual === resourceKind;
      })
    : all;

  const saved = items.filter((item) => item.saved).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={
          <>
            <HeaderMeta label="Items">{items.length}</HeaderMeta>
            <HeaderMeta label="Saved">{saved}</HeaderMeta>
          </>
        }
        action={
          <ButtonLink href="/toolbox" variant="secondary" size="sm">
            Search everything
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">
          <p>
            Items appear as the curriculum is published. Each one will say what
            it is for, when to reach for it, and what you should produce with it.
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.row.id}>
              <ToolboxItemCard item={item.row} showKind={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
