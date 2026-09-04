import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { getBreakdown, getOverview, getTopLinks } from "@/lib/analytics/queries";
import { clickThroughRate, resolveWindow } from "@/lib/analytics/ranges";
import { DEVICE_LABELS, type Device } from "@/lib/analytics/types";
import { getEditorDraft } from "@/lib/editor/load";
import { linkState } from "@/lib/links/schedule";
import { evaluate, type OptimizationReport } from "@/lib/optimize/engine";
import { MIN_DEVICE_VIEWS } from "@/lib/optimize/thresholds";
import type { DeviceMetric, LinkMetric, PageMetrics } from "@/lib/optimize/types";
import type { Draft } from "@/lib/editor/state";

/**
 * Turning a creator's page and their analytics into the one object the rules read.
 *
 * Everything here is assembled from things that already exist. The counts come
 * from the Phase 6 analytics functions — the same aggregates the analytics
 * page renders, so a percentage shown here and a percentage shown there are
 * the same number by construction rather than by coincidence. The page itself
 * comes from `getEditorDraft`, which is the loader the editor uses, so the
 * position this feature calls "#4" is the position the editor will move.
 *
 * There is no new definition of a view, a click or a click-through rate
 * anywhere in this module, and no query that reads a raw event row.
 *
 * ── The window ──────────────────────────────────────────────────────────────
 *
 * Thirty days, fixed, for everything on the page. Long enough that a weekend
 * does not dominate it, short enough to describe the page as it is now rather
 * than as it was in spring. Every number a recommendation quotes comes from
 * this one window, and every recommendation says so — the failure this avoids
 * is a card that compares a lifetime click count against a week of traffic.
 */

const RANGE = "30d" as const;
const WINDOW_LABEL = "last 30 days";

const DAY_MS = 86_400_000;

/* ── Devices ──────────────────────────────────────────────────────────────── */

/**
 * Views and clicks per device.
 *
 * The one aggregate this feature needed that Phase 6 did not already have,
 * and the reason it is device rather than source is written out in
 * `rules/audience.ts`: a click's device is measured the same way a view's is,
 * and a click's *source* is not.
 */
const getDevicePerformance = cache(async (): Promise<DeviceMetric[]> => {
  const profile = await requireClaimedProfile();
  const window = resolveWindow(RANGE, new Date(), new Date(profile.created_at));
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("analytics_device_performance", {
      p_from: window.from.toISOString(),
      p_to: window.to.toISOString(),
    });
    if (error || !data) return [];

    return data.map((row) => {
      const device = (row.device ?? "unknown") as Device;
      const views = Number(row.views ?? 0);
      const clicks = Number(row.clicks ?? 0);
      return {
        device,
        label: DEVICE_LABELS[device] ?? device,
        views,
        clicks,
        // Null below the floor rather than a rate computed from nine visits.
        // `clickThroughRate` is Phase 6's function, so this is the same
        // arithmetic the dashboard's CTR uses, narrowed to one device.
        ctr: views >= MIN_DEVICE_VIEWS ? clickThroughRate(clicks, views) : null,
      };
    });
  } catch {
    return [];
  }
});

/* ── The page ─────────────────────────────────────────────────────────────── */

/**
 * Every link a visitor can currently see, numbered from the top.
 *
 * The walk is blocks in page order, then links in theirs, skipping hidden
 * blocks and links a visitor cannot see — which is the same walk the public
 * renderer does, because it is the same data in the same order. A hidden link
 * has no position on the page, so it does not get one here, and no rule can
 * recommend moving something nobody can see.
 *
 * Clicks come from `getTopLinks`, including its `share`. Recomputing the share
 * from a different denominator would produce a number a decimal point away
 * from the one on the analytics page, which is exactly the kind of small
 * inconsistency that makes a creator stop trusting both.
 */
function linksFrom(draft: Draft, clicksById: Map<string, { clicks: number; share: number }>, now: Date): LinkMetric[] {
  const links: LinkMetric[] = [];
  let position = 0;
  let blockIndex = 0;

  for (const block of draft.blocks) {
    if (block.type !== "links" || !block.isVisible) continue;

    const title = typeof block.data.title === "string" && block.data.title.trim().length > 0
      ? block.data.title.trim()
      : null;

    let positionInBlock = 0;
    for (const link of block.links) {
      const state = linkState(link, now);
      // Unpublished links are not on the page at all; scheduled and expired
      // ones are on it in the creator's view, which is where they need
      // attention, so they are kept and flagged.
      if (!link.isActive) continue;

      const counted = clicksById.get(link.id);
      const visible = state === "live";
      if (visible) position += 1;

      links.push({
        id: link.id,
        title: link.title.trim() || "Untitled link",
        // A link nobody can see has no position, and zero says so. Handing it
        // the next visible link's number put two links called "#3" on the
        // same screen.
        position: visible ? position : 0,
        visible,
        blockId: block.id,
        blockTitle: title,
        blockIndex,
        positionInBlock,
        clicks: counted?.clicks ?? 0,
        share: counted?.share ?? 0,
        isFeatured: link.isFeatured,
        ageDays: link.createdAt
          ? Math.max(0, Math.floor((now.getTime() - new Date(link.createdAt).getTime()) / DAY_MS))
          : 0,
        expired: state === "expired",
        scheduled: state === "scheduled",
      });
      positionInBlock += 1;
    }

    blockIndex += 1;
  }

  return links;
}

/**
 * Everything the rules are allowed to know, for the signed-in creator.
 *
 * Five aggregates and one page read, in parallel. `cache()` on each of the
 * analytics functions means the overview is computed once even though
 * `getTopLinks` also needs it.
 */
export const getPageMetrics = cache(async (): Promise<PageMetrics> => {
  const now = new Date();

  const [overview, topLinks, sources, devices, draft] = await Promise.all([
    getOverview(RANGE),
    // Fifty rather than ten: the rules need a count for every link, not a
    // leaderboard. A link absent from this list has fewer clicks than the
    // fiftieth, which for these purposes is zero.
    getTopLinks(RANGE, 50),
    getBreakdown(RANGE, "source"),
    getDevicePerformance(),
    getEditorDraft(),
  ]);

  const clicksById = new Map(
    topLinks
      .filter((link): link is typeof link & { id: string } => link.id !== null)
      .map((link) => [link.id, { clicks: link.clicks, share: link.share }]),
  );

  return {
    window: { from: new Date(now.getTime() - 30 * DAY_MS), to: now, days: 30, label: WINDOW_LABEL },
    views: overview.views,
    clicks: overview.clicks,
    ctr: overview.ctr,
    previous: overview.previous,
    links: linksFrom(draft, clicksById, now),
    devices,
    sources,
    profile: {
      hasAvatar: Boolean(draft.profile.avatarUrl),
      hasDisplayName: draft.profile.displayName.trim().length > 0,
      hasBio: draft.profile.bio.trim().length > 0,
      socialCount: draft.socials.filter((social) => social.isActive).length,
    },
    at: now,
  };
});

/* ── Dismissals and history ───────────────────────────────────────────────── */

export interface OptimizationEvent {
  id: string;
  kind: "applied" | "dismissed";
  recommendationType: string;
  recommendationKey: string;
  summary: string;
  undoable: boolean;
  undoneAt: string | null;
  createdAt: string;
}

/** What this creator has applied and dismissed, newest first. */
export const getOptimizationHistory = cache(async (limit = 30): Promise<OptimizationEvent[]> => {
  await requireClaimedProfile();
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("optimization_events")
      .select("id, kind, recommendation_type, recommendation_key, summary, undo, undone_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      kind: row.kind === "dismissed" ? ("dismissed" as const) : ("applied" as const),
      recommendationType: row.recommendation_type,
      recommendationKey: row.recommendation_key,
      summary: row.summary,
      undoable: row.undo !== null && row.undone_at === null,
      undoneAt: row.undone_at,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
});

/**
 * The whole report: metrics, score, ranked recommendations, history.
 *
 * The one function the page calls. Everything expensive in it is an aggregate
 * over one creator's own rows inside an indexed time range, and none of it
 * runs anywhere near a public page.
 */
export const getOptimizationReport = cache(
  async (): Promise<OptimizationReport & { history: OptimizationEvent[] }> => {
    const [metrics, history] = await Promise.all([getPageMetrics(), getOptimizationHistory()]);

    const dismissed = new Set(
      history
        .filter((event) => event.kind === "dismissed")
        .map((event) => event.recommendationKey),
    );

    return { ...evaluate(metrics, dismissed), history };
  },
);
