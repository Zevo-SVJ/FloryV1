import Link from "next/link";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/states/empty-state";
import { Group } from "@/components/ui/list";
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
  empty,
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
  /** What to say when this particular view has nothing in it. */
  empty?: { title: string; body: string };
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
    <Screen
      title={title}
      eyebrow={eyebrow}
      lede={description}
      back={{ href: "/toolbox", label: "Toolbox" }}
      width="content"
      actions={<ButtonLink href="/toolbox" variant="secondary" size="sm">
            Search everything
          </ButtonLink>}
    >
      <div className="space-y-8">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-footnote text-ink-subtle">
          <span>
            <span className="font-mono tabular-nums text-ink">{items.length}</span>{" "}
            {items.length === 1 ? "item" : "items"}
          </span>
          {saved > 0 ? (
            <span>
              <span className="font-mono tabular-nums text-ink">{saved}</span> saved
            </span>
          ) : null}
        </p>


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
                    ? "tactile inline-flex min-h-9 items-center rounded-pill bg-ink px-3.5 text-footnote font-medium text-ink-inverse"
                    : "tactile inline-flex min-h-9 items-center rounded-pill bg-ink/[0.06] px-3.5 text-footnote font-medium text-ink-muted hover:bg-ink/[0.1] hover:text-ink"
                }
              >
                {view.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <Group>
        {items.length === 0 ? (
          <EmptyState title={empty?.title ?? "Nothing here yet"}>
            {empty?.body ??
              "The Toolbox is curated rather than collected: a thing is here because a lesson or a mission sends you to it, and it says what it is for and what you should produce with it."}
          </EmptyState>
        ) : (
          items.map((item) => (
            <ToolboxItemCard key={item.row.id} item={item.row} showKind={false} />
          ))
        )}
      </Group>
      </div>
    </Screen>
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
