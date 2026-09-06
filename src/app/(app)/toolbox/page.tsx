import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/states/empty-state";
import { Group } from "@/components/ui/list";
import { ToolboxItemCard } from "@/components/toolbox/item-card";
import { searchToolbox, getToolboxFacets, getSavedItems, getRecentItems } from "@/lib/toolbox/queries";
import { KIND_PLURAL, TOOLBOX_KINDS, type ToolboxKind } from "@/lib/toolbox/schemas";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Toolbox" };

/**
 * The Toolbox, and its search.
 *
 * `/toolbox` used to redirect to Prompts. It is a real page now because the
 * unified search is the answer to the failure mode this whole layer has: a
 * library big enough to be useful is a library nobody can navigate. One box
 * across six kinds, ranked so a title match wins.
 *
 * Search is a GET form with no JavaScript. The query lives in the URL, which
 * means a result set is a link somebody can send, a back button works, and the
 * page keeps working while the bundle is still loading.
 */
export default async function ToolboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; phase?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const kind = TOOLBOX_KINDS.includes(params.kind as ToolboxKind)
    ? (params.kind as ToolboxKind)
    : undefined;

  const [results, facets, saved, recent] = await Promise.all([
    searchToolbox({ query: params.q, kind, phase: params.phase, tag: params.tag }),
    getToolboxFacets(),
    getSavedItems(),
    getRecentItems(4),
  ]);

  const searching = Boolean(params.q?.trim() || kind || params.phase || params.tag);

  return (
    <Screen
      title="Your operating library"
      eyebrow="Toolbox"
      lede="Prompts, frameworks, templates, checklists, resources and the stack. Everything here answers what it is, when to use it, and what you should produce with it."
      width="content"
    >
      <div className="space-y-8">

      {/* A GET form: the query is the URL. */}
      <form method="get" action="/toolbox" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="toolbox-q" className="sr-only">
              Search the Toolbox
            </label>
            <input
              id="toolbox-q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Search prompts, frameworks, templates…"
              className="h-11 w-full rounded-control bg-surface px-3.5 text-[0.9375rem] text-ink ring-1 ring-border-strong placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>

          <select
            name="phase"
            defaultValue={params.phase ?? ""}
            aria-label="Filter by phase"
            className="h-11 rounded-control border border-border-strong bg-surface px-3 text-sm text-ink"
          >
            <option value="">Any phase</option>
            {facets.phases.map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-11 shrink-0 rounded-control bg-ink px-5 text-[0.9375rem] font-medium text-ink-inverse transition-opacity hover:opacity-90"
          >
            Search
          </button>
        </div>

        {/* Kind filter as links, so each is its own shareable URL. */}
        <nav aria-label="Filter by kind" className="flex flex-wrap gap-2">
          <FilterLink label="Everything" href="/toolbox" active={!kind} />
          {TOOLBOX_KINDS.map((candidate) => (
            <FilterLink
              key={candidate}
              label={KIND_PLURAL[candidate]}
              href={`/toolbox?kind=${candidate}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
              active={kind === candidate}
            />
          ))}
        </nav>
      </form>

      {results.length === 0 ? (
        <Group>
          <EmptyState title={searching ? "Nothing matched" : "The library is empty"}>
            {searching
              ? "Try a broader word, or clear the filters. Search covers titles, summaries and the contents of every item."
              : "Items appear here as the curriculum is published."}
          </EmptyState>
        </Group>
      ) : (
        <Group title={searching ? "Results" : "Everything"}>
          {results.map((item) => (
            <ToolboxItemCard key={item.row.id} item={item.row} />
          ))}
        </Group>
      )}

      {!searching && saved.length > 0 ? (
        <Group title="Saved">
          {saved.map((item) => (
            <ToolboxItemCard key={item.row.id} item={item.row} />
          ))}
        </Group>
      ) : null}

      {!searching && recent.length > 0 ? (
        <Group title="Recently used">
          {recent.map((item) => (
            <ToolboxItemCard key={item.id} item={item} />
          ))}
        </Group>
      ) : null}
      </div>
    </Screen>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "tactile inline-flex min-h-9 items-center rounded-pill px-3.5 text-footnote font-medium",
        active
          ? "bg-ink text-ink-inverse"
          : "bg-ink/[0.06] text-ink-muted hover:bg-ink/[0.1] hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
