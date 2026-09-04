"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { revalidatePublicPage } from "@/lib/public-page/revalidate";
import { getEditorDraft } from "@/lib/editor/load";
import { getPageMetrics } from "@/lib/optimize/queries";
import { evaluate } from "@/lib/optimize/engine";
import { reorderWithin, undoSchema, type UndoPayload } from "@/lib/optimize/undo";
import type { OptimizeResult, UndoResult } from "@/lib/optimize/results";
import type { Recommendation } from "@/lib/optimize/types";
import type { DraftBlock } from "@/lib/editor/state";

/**
 * Everything Smart Optimization writes.
 *
 * One rule shapes all of it, and it is stronger than "validate the input":
 * **the client does not describe the change.** A caller sends a
 * recommendation key and nothing else. The server recomputes the whole report
 * from the creator's own analytics, finds that key among the recommendations
 * it just generated, and performs the action *it* derived. There is no link id
 * on the wire, no position, no ordering — so there is nothing to tamper with,
 * and a request naming another creator's link is not refused so much as
 * meaningless: their link cannot appear in this creator's report.
 *
 * The same mechanism answers a second requirement for free. A recommendation
 * that no longer applies — because the creator already moved the link, or the
 * data moved — is not regenerated, so applying it fails with a sentence saying
 * exactly that. There is no window in which a stale button does something
 * unexpected.
 *
 * Underneath, `requireClaimedProfile()` verifies the session on every call and
 * Row Level Security decides which rows any of these statements can touch.
 * Both would hold on their own; neither is relied on alone.
 */

const GONE =
  "That recommendation no longer applies — your page or your numbers have changed since it was written.";
const FAILED = "That did not save. Check your connection and try again.";

/**
 * Which of a recommendation's own actions is being applied.
 *
 * Not a description of the change — a choice between the two the server
 * itself wrote. "Review this link" and "Hide it for now" are the primary and
 * secondary of the same card, and the caller has to be able to say which
 * button was pressed without being able to say what the button does.
 */
export type ActionSlot = "primary" | "secondary";

/** The report as the server sees it right now, with dismissals applied. */
async function currentRecommendation(key: string): Promise<Recommendation | null> {
  const supabase = await createClient();
  const metrics = await getPageMetrics();

  const { data } = await supabase
    .from("optimization_events")
    .select("recommendation_key")
    .eq("kind", "dismissed");

  const dismissed = new Set((data ?? []).map((row) => row.recommendation_key));
  const report = evaluate(metrics, dismissed);

  return report.recommendations.find((item) => item.key === key) ?? null;
}

/** The links block a link belongs to, from the creator's own page. */
function blockContaining(blocks: DraftBlock[], linkId: string): DraftBlock | null {
  return blocks.find((block) => block.links.some((link) => link.id === linkId)) ?? null;
}

async function record(
  profileId: string,
  recommendation: Recommendation,
  summary: string,
  undo: UndoPayload | null,
): Promise<string | undefined> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("optimization_events")
    .insert({
      profile_id: profileId,
      kind: "applied",
      recommendation_type: recommendation.type,
      recommendation_key: recommendation.key,
      summary: summary.slice(0, 300),
      undo,
    })
    .select("id")
    .maybeSingle();

  return data?.id;
}

function refresh(username: string): void {
  revalidatePublicPage(username);
  revalidatePath("/dashboard/optimize");
  revalidatePath("/editor");
}

/* ── Applying ─────────────────────────────────────────────────────────────── */

/**
 * Do the thing the card offered.
 *
 * The switch below is exhaustive over the actions that write. `link` actions
 * are navigation and never reach here — a card whose only action is "Open
 * editor" renders an anchor, not a form.
 */
export async function applyOptimization(
  key: string,
  slot: ActionSlot = "primary",
): Promise<OptimizeResult> {
  const profile = await requireClaimedProfile();

  if (typeof key !== "string" || key.length === 0 || key.length > 200) {
    return { ok: false, message: GONE };
  }
  if (slot !== "primary" && slot !== "secondary") {
    return { ok: false, message: GONE };
  }

  const recommendation = await currentRecommendation(key);
  if (!recommendation) return { ok: false, message: GONE };

  /*
   * The action is picked from the recommendation the server just generated,
   * never from the request. `slot` chooses between this card's own buttons and
   * can name nothing else — the worst a crafted value can do is select the
   * other button on the same card, which is a button the creator could have
   * pressed anyway.
   */
  const action =
    slot === "primary"
      ? recommendation.action
      : (recommendation.secondary ?? []).find((item) => item.kind !== "link");

  if (!action || action.kind === "link") return { ok: false, message: GONE };

  const draft = await getEditorDraft();
  const supabase = await createClient();

  switch (action.kind) {
    case "move_link_to_top": {
      const block = blockContaining(draft.blocks, action.linkId);
      if (!block) return { ok: false, message: GONE };

      const before = block.links.map((link, index) => ({ id: link.id, position: index }));
      const desired = [
        action.linkId,
        ...block.links.filter((link) => link.id !== action.linkId).map((link) => link.id),
      ];
      const after = reorderWithin(block.links, desired);

      const { error } = await supabase.rpc("optimize_reorder_links", { p_order: after });
      if (error) return { ok: false, message: FAILED };

      const title = block.links.find((link) => link.id === action.linkId)?.title ?? "That link";
      const summary = `Moved ${title.trim() || "a link"} to the top of ${block.data.title || "its section"}`;
      const eventId = await record(profile.id, recommendation, summary, {
        kind: "positions",
        links: before,
      });

      refresh(profile.username);
      return { ok: true, summary, undoEventId: eventId };
    }

    case "reorder_links": {
      /*
       * Applied block by block, because the recommendation's order is the
       * order of the visible links across the page and positions are stored
       * per block. Splitting it here — rather than sending one flat list —
       * is what makes it impossible for this action to move a link out of the
       * section its creator put it in.
       */
      const updates: { id: string; position: number }[] = [];
      const before: { id: string; position: number }[] = [];

      for (const block of draft.blocks) {
        if (block.type !== "links" || block.links.length === 0) continue;

        const desired = action.order.filter((id) =>
          block.links.some((link) => link.id === id),
        );
        if (desired.length === 0) continue;

        block.links.forEach((link, index) => before.push({ id: link.id, position: index }));
        updates.push(...reorderWithin(block.links, desired));
      }

      if (updates.length === 0) return { ok: false, message: GONE };

      const { error } = await supabase.rpc("optimize_reorder_links", { p_order: updates });
      if (error) return { ok: false, message: FAILED };

      const summary = `Reordered ${action.changes.length} link${action.changes.length === 1 ? "" : "s"} by clicks`;
      const eventId = await record(profile.id, recommendation, summary, {
        kind: "positions",
        links: before,
      });

      refresh(profile.username);
      return { ok: true, summary, undoEventId: eventId };
    }

    case "feature_link": {
      const link = draft.blocks.flatMap((block) => block.links).find((item) => item.id === action.linkId);
      if (!link) return { ok: false, message: GONE };

      const { error } = await supabase
        .from("links")
        .update({ is_featured: true })
        .eq("id", action.linkId);
      if (error) return { ok: false, message: FAILED };

      const summary = `Featured ${link.title.trim() || "a link"}`;
      const eventId = await record(profile.id, recommendation, summary, {
        kind: "featured",
        linkId: action.linkId,
        previous: link.isFeatured,
      });

      refresh(profile.username);
      return { ok: true, summary, undoEventId: eventId };
    }

    case "hide_link": {
      const link = draft.blocks.flatMap((block) => block.links).find((item) => item.id === action.linkId);
      if (!link) return { ok: false, message: GONE };

      const { error } = await supabase
        .from("links")
        .update({ is_active: false })
        .eq("id", action.linkId);
      if (error) return { ok: false, message: FAILED };

      const summary = `Hid ${link.title.trim() || "a link"} from the page`;
      const eventId = await record(profile.id, recommendation, summary, {
        kind: "active",
        linkId: action.linkId,
        previous: link.isActive,
      });

      refresh(profile.username);
      return { ok: true, summary, undoEventId: eventId };
    }
  }
}

/* ── Putting it back ──────────────────────────────────────────────────────── */

/**
 * Undo one applied optimization.
 *
 * The event id is a client-supplied identifier, which is exactly the kind of
 * value this phase's brief says never to trust — so it is not trusted. The
 * row is fetched under the creator's own session, so Row Level Security
 * returns nothing for an id belonging to somebody else, and the payload is
 * re-parsed with the schema it was written with before a single row is
 * touched.
 */
export async function undoOptimization(eventId: string): Promise<UndoResult> {
  const profile = await requireClaimedProfile();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("optimization_events")
    .select("id, kind, summary, undo, undone_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.kind !== "applied") {
    return { ok: false, message: "There is nothing to undo here." };
  }
  if (event.undone_at !== null) {
    return { ok: false, message: "That change has already been undone." };
  }

  const parsed = undoSchema.safeParse(event.undo);
  if (!parsed.success) {
    return { ok: false, message: "That change cannot be undone automatically." };
  }

  const payload = parsed.data;

  if (payload.kind === "positions") {
    const { error } = await supabase.rpc("optimize_reorder_links", { p_order: payload.links });
    if (error) return { ok: false, message: FAILED };
  } else if (payload.kind === "featured") {
    const { error } = await supabase
      .from("links")
      .update({ is_featured: payload.previous })
      .eq("id", payload.linkId);
    if (error) return { ok: false, message: FAILED };
  } else {
    const { error } = await supabase
      .from("links")
      .update({ is_active: payload.previous })
      .eq("id", payload.linkId);
    if (error) return { ok: false, message: FAILED };
  }

  await supabase
    .from("optimization_events")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", event.id);

  refresh(profile.username);
  return { ok: true, summary: `Undone — ${event.summary.toLowerCase()}` };
}

/* ── Not now ──────────────────────────────────────────────────────────────── */

/**
 * Stop showing one recommendation.
 *
 * A preference, and nothing more. It writes one row to `optimization_events`
 * and touches no analytics: a dismissed recommendation still counts every
 * click it was derived from, and the numbers on the analytics page do not move
 * because somebody closed a card. The unique index means dismissing twice is
 * the same as dismissing once.
 */
export async function dismissRecommendation(key: string): Promise<OptimizeResult> {
  const profile = await requireClaimedProfile();

  const recommendation = await currentRecommendation(key);
  if (!recommendation) return { ok: false, message: GONE };

  const supabase = await createClient();
  const { error } = await supabase.from("optimization_events").insert({
    profile_id: profile.id,
    kind: "dismissed",
    recommendation_type: recommendation.type,
    recommendation_key: recommendation.key,
    summary: recommendation.title.slice(0, 300),
    undo: null,
  });

  // 23505 is the partial unique index: already dismissed, which is the state
  // the caller wanted anyway.
  if (error && error.code !== "23505") return { ok: false, message: FAILED };

  revalidatePath("/dashboard/optimize");
  return { ok: true, summary: `Dismissed — ${recommendation.title}` };
}

/** Show a dismissed recommendation again, if the situation still exists. */
export async function restoreRecommendation(key: string): Promise<OptimizeResult> {
  await requireClaimedProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("optimization_events")
    .delete()
    .eq("kind", "dismissed")
    .eq("recommendation_key", key);

  if (error) return { ok: false, message: FAILED };

  revalidatePath("/dashboard/optimize");
  return { ok: true, summary: "Restored" };
}
