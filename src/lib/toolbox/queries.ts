import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/dal";
import { parseToolboxBody, type ToolboxBody, type ToolboxKind } from "@/lib/toolbox/schemas";
import type { ToolboxItemRow } from "@/types/database";

/**
 * Reads for the Toolbox.
 *
 * Content is platform-owned, so these are plain reads with no owner filtering —
 * Row Level Security serves published items to any signed-in account and drafts
 * to staff. The learner-owned reads below (saved, recent, checklist state) are
 * private even from staff, and again the policies decide, not these queries.
 */

export interface ToolboxItem {
  row: ToolboxItemRow;
  /** Null when the body failed its schema. The caller decides what to show. */
  parsed: ToolboxBody | null;
  saved: boolean;
}

const withBody = (row: ToolboxItemRow, savedIds: Set<string>): ToolboxItem => ({
  row,
  parsed: parseToolboxBody(row.kind, row.body),
  saved: savedIds.has(row.id),
});

const savedIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("learner_saved_items").select("item_id");
  return new Set((data ?? []).map((row) => row.item_id));
});

/** Every published item, optionally of one kind. */
export const getToolboxItems = cache(async (kind?: ToolboxKind): Promise<ToolboxItem[]> => {
  const supabase = await createClient();

  let query = supabase.from("toolbox_items").select("*").order("position");
  if (kind) query = query.eq("kind", kind);

  const [{ data }, saved] = await Promise.all([query, savedIds()]);
  return (data ?? []).map((row) => withBody(row, saved));
});

/**
 * Search, filter, or both.
 *
 * `websearch_to_tsquery` rather than `plainto_tsquery`, so quoted phrases and a
 * leading `-` work the way somebody expects from a search box. An empty query
 * is a browse, not a search returning nothing.
 *
 * Ranking is left to the generated column's weights: title beats summary beats
 * body. Somebody typing "validation" wants the framework named for it before
 * the prompt that mentions it in passing.
 */
export const searchToolbox = cache(
  async (options: {
    query?: string;
    kind?: ToolboxKind;
    phase?: string;
    tag?: string;
  }): Promise<ToolboxItem[]> => {
    const supabase = await createClient();

    let request = supabase.from("toolbox_items").select("*");

    const term = options.query?.trim();
    if (term) {
      request = request.textSearch("search", term, { type: "websearch", config: "english" });
    } else {
      request = request.order("position");
    }

    if (options.kind) request = request.eq("kind", options.kind);
    if (options.phase) request = request.eq("phase_key", options.phase);
    if (options.tag) request = request.contains("tags", [options.tag]);

    const [{ data, error }, saved] = await Promise.all([request, savedIds()]);

    /*
     * A malformed query — an unbalanced quote, a lone operator — makes Postgres
     * raise rather than return nothing. An empty result is the honest answer to
     * a search box; an error page is not.
     */
    if (error) return [];

    return (data ?? []).map((row) => withBody(row, saved));
  },
);

export interface ToolboxItemDetail extends ToolboxItem {
  related: ToolboxItemRow[];
  /** Ticked ids, for a checklist. Empty for everything else. */
  checkedIds: string[];
}

export const getToolboxItem = cache(async (slug: string): Promise<ToolboxItemDetail | null> => {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("toolbox_items")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!row) return null;

  const [links, checklist, saved] = await Promise.all([
    supabase.from("toolbox_item_links").select("related_item_id").eq("item_id", row.id),
    row.kind === "checklist"
      ? supabase
          .from("learner_checklist_progress")
          .select("checked_ids")
          .eq("item_id", row.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    savedIds(),
  ]);

  const relatedIds = (links.data ?? []).map((link) => link.related_item_id);
  const related = relatedIds.length
    ? ((await supabase.from("toolbox_items").select("*").in("id", relatedIds)).data ?? [])
    : [];

  return {
    ...withBody(row, saved),
    related,
    checkedIds: checklist.data?.checked_ids ?? [],
  };
});

/** The items a lesson or a mission says apply to it. */
export const getToolsForLesson = cache(async (lessonId: string): Promise<ToolboxItemRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_toolbox_items")
    .select("item_id, position")
    .eq("lesson_id", lessonId)
    .order("position");

  return resolveItems((data ?? []).map((row) => row.item_id));
});

export const getToolsForMission = cache(async (missionId: string): Promise<ToolboxItemRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mission_toolbox_items")
    .select("item_id, position")
    .eq("mission_id", missionId)
    .order("position");

  return resolveItems((data ?? []).map((row) => row.item_id));
});

async function resolveItems(ids: string[]): Promise<ToolboxItemRow[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("toolbox_items").select("*").in("id", ids);

  // Preserve the curated order rather than whatever the database returned.
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is ToolboxItemRow => row !== undefined);
}

export const getSavedItems = cache(async (): Promise<ToolboxItem[]> => {
  await requireProfile();
  const supabase = await createClient();

  const { data: saved } = await supabase
    .from("learner_saved_items")
    .select("item_id")
    .order("created_at", { ascending: false });

  const ids = (saved ?? []).map((row) => row.item_id);
  if (ids.length === 0) return [];

  const rows = await resolveItems(ids);
  const savedSet = new Set(ids);
  return rows.map((row) => withBody(row, savedSet));
});

export const getRecentItems = cache(async (limit = 6): Promise<ToolboxItemRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learner_recent_items")
    .select("item_id")
    .order("viewed_at", { ascending: false })
    .limit(limit);

  return resolveItems((data ?? []).map((row) => row.item_id));
});

/** Phases and tags present in the library, for the filter controls. */
export const getToolboxFacets = cache(async (): Promise<{ phases: string[]; tags: string[] }> => {
  const supabase = await createClient();
  const { data } = await supabase.from("toolbox_items").select("phase_key, tags");

  const phases = new Set<string>();
  const tags = new Set<string>();
  for (const row of data ?? []) {
    if (row.phase_key) phases.add(row.phase_key);
    for (const tag of row.tags ?? []) tags.add(tag);
  }

  return { phases: [...phases].sort(), tags: [...tags].sort() };
});
