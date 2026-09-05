import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { Label } from "@/components/ui/surface";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Toolbox"
        title="Your operating library"
        description="Prompts, frameworks, templates, checklists, resources and the stack. Everything here answers what it is, when to use it, and what you should produce with it."
        meta={
          <>
            <HeaderMeta label="Items">{results.length}</HeaderMeta>
            <HeaderMeta label="Saved">{saved.length}</HeaderMeta>
          </>
        }
      />

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
        <EmptyState title={searching ? "Nothing matched" : "The library is empty"}>
          {searching ? (
            <p>
              Try a broader word, or clear the filters. Search covers titles,
              summaries and the contents of every item.
            </p>
          ) : (
            <p>Items appear here as the curriculum is published.</p>
          )}
        </EmptyState>
      ) : (
        <section className="space-y-3">
          <Label as="h2">{searching ? "Results" : "Everything"}</Label>
          <ul className="space-y-2">
            {results.map((item) => (
              <li key={item.row.id}>
                <ToolboxItemCard item={item.row} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!searching && saved.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">Saved</Label>
          <ul className="space-y-2">
            {saved.map((item) => (
              <li key={item.row.id}>
                <ToolboxItemCard item={item.row} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!searching && recent.length > 0 ? (
        <section className="space-y-3">
          <Label as="h2">Recently used</Label>
          <ul className="space-y-2">
            {recent.map((item) => (
              <li key={item.id}>
                <ToolboxItemCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "label inline-flex min-h-11 items-center rounded-control border px-3 transition-colors",
        active
          ? "border-accent bg-accent-quiet text-ink"
          : "border-border text-ink-muted hover:bg-surface-sunken hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
