import Link from "next/link";
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
  views,
  activeView,
}: {
  kind: ToolboxKind;
  eyebrow: string;
  title: string;
  description: string;
  resourceKind?: "video" | "article" | "doc" | "tool" | "book" | "reference";
  /**
   * Sibling views of the same library.
   *
   * Resources used to be three sidebar destinations — Videos, Docs, References
   * — which is one library filtered three ways, presented as three places to
   * remember. They are one destination now, and this row is how the narrower
   * views stay reachable from it instead of becoming orphans.
   */
  views?: readonly { href: string; label: string }[];
  activeView?: string;
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

      {views && views.length > 0 ? (
        <nav aria-label="Views" className="flex flex-wrap gap-2">
          {views.map((view) => {
            const active = view.href === activeView;
            return (
              <Link
                key={view.href}
                href={view.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "label rounded-control bg-accent-quiet px-3 py-2 text-accent"
                    : "label rounded-control px-3 py-2 text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
                }
              >
                {view.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet">
          <p>
            Items appear as the curriculum is published. Each one will say what
            it is for, when to reach for it, and what you should produce with it.
          </p>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
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

/**
 * The four views onto the resource library.
 *
 * One list, so the row cannot say something different on each of the four
 * pages that draw it.
 */
export const RESOURCE_VIEWS = [
  { href: "/resources", label: "Everything" },
  { href: "/resources/videos", label: "Videos" },
  { href: "/resources/docs", label: "Docs" },
  { href: "/resources/references", label: "References" },
] as const;
