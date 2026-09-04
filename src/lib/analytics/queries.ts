import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { canEstimateVisitors } from "@/lib/analytics/visitor";
import { clickThroughRate, percentChange, resolveWindow, type RangeId } from "@/lib/analytics/ranges";
import { sourceLabel } from "@/lib/analytics/sources";
import { DEVICE_LABELS, type Device } from "@/lib/analytics/types";
import { countryName } from "@/lib/analytics/countries";

/**
 * Everything the dashboard reads, in one place.
 *
 * Each function is one round trip to a `security invoker` Postgres function
 * that aggregates in the database and returns a handful of rows. None of them
 * takes a profile id — Row Level Security decides whose rows they see, which
 * means there is no argument anybody could get wrong and no code path where a
 * creator could ask about somebody else.
 *
 * Nothing here fetches raw events. A dashboard that pulled every row to count
 * it would work for a week and fall over in a month, and the counting is what
 * Postgres is for.
 *
 * Errors come back as empty results rather than exceptions. A creator whose
 * analytics query failed should see an empty chart and a working page, not an
 * error boundary over the whole dashboard.
 */

const iso = (date: Date) => date.toISOString();

/* ── Overview ─────────────────────────────────────────────────────────────── */

export interface Overview {
  views: number;
  clicks: number;
  /** Null when the deployment cannot estimate them at all. */
  visitors: number | null;
  /** Clicks ÷ views. Null when there were no views. */
  ctr: number | null;
  /** Percentage change against the previous window, or null when meaningless. */
  change: { views: number | null; clicks: number | null; ctr: number | null };
  /** False when there is no previous window to compare against. */
  comparable: boolean;
  /**
   * The raw totals of the window before this one, or null when there is none.
   *
   * The dashboard renders `change` and never looks at these. Smart
   * Optimization needs the counts themselves, because a percentage is only
   * publishable once both windows are large enough — and it must decide that
   * from the same numbers the percentage was computed from rather than
   * fetching its own and hoping they agree.
   */
  previous: { views: number; clicks: number } | null;
}

export const getOverview = cache(async (range: RangeId): Promise<Overview> => {
  const profile = await requireClaimedProfile();
  const window = resolveWindow(range, new Date(), new Date(profile.created_at));
  const supabase = await createClient();

  const current = await totals(supabase, window.from, window.to);

  /*
   * The previous period is only fetched when there is one. An account younger
   * than the window has no comparable history, and inventing a baseline is how
   * a dashboard ends up reporting a rise from nothing.
   */
  const previous = window.previous
    ? await totals(supabase, window.previous.from, window.previous.to)
    : null;

  const ctr = clickThroughRate(current.clicks, current.views);
  const previousCtr = previous ? clickThroughRate(previous.clicks, previous.views) : null;

  return {
    views: current.views,
    clicks: current.clicks,
    visitors: canEstimateVisitors() ? current.visitors : null,
    ctr,
    change: {
      views: percentChange(current.views, previous?.views ?? null),
      clicks: percentChange(current.clicks, previous?.clicks ?? null),
      ctr: ctr !== null && previousCtr !== null ? percentChange(ctr, previousCtr) : null,
    },
    comparable: previous !== null,
    previous: previous ? { views: previous.views, clicks: previous.clicks } : null,
  };
});

async function totals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: Date,
  to: Date,
): Promise<{ views: number; clicks: number; visitors: number }> {
  try {
    const { data, error } = await supabase.rpc("analytics_overview", {
      p_from: iso(from),
      p_to: iso(to),
    });
    if (error || !data?.[0]) return { views: 0, clicks: 0, visitors: 0 };

    const row = data[0];
    return {
      views: Number(row.views ?? 0),
      clicks: Number(row.clicks ?? 0),
      visitors: Number(row.visitors ?? 0),
    };
  } catch {
    return { views: 0, clicks: 0, visitors: 0 };
  }
}

/* ── Over time ────────────────────────────────────────────────────────────── */

export interface SeriesPoint {
  at: Date;
  views: number;
  clicks: number;
}

export const getSeries = cache(async (range: RangeId): Promise<SeriesPoint[]> => {
  const profile = await requireClaimedProfile();
  const window = resolveWindow(range, new Date(), new Date(profile.created_at));
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("analytics_timeseries", {
      p_from: iso(window.from),
      p_to: iso(window.to),
      p_bucket: window.bucket,
      /*
       * Where the chart should begin, said rather than guessed.
       *
       * All time starts at the epoch, because that is what all time means for
       * a total. A chart of it should still begin at the creator's first view
       * — fifty-five empty years is not a shape — and no other range should,
       * because for a chosen window the empty days at the start are the
       * information. The function cannot tell those apart from the window
       * alone, so this is the one place that knows saying so.
       */
      p_from_first_event: range === "all",
    });
    if (error || !data) return [];

    return data.map((row) => ({
      at: new Date(row.bucket),
      views: Number(row.views ?? 0),
      clicks: Number(row.clicks ?? 0),
    }));
  } catch {
    return [];
  }
});

/* ── Links ────────────────────────────────────────────────────────────────── */

export interface LinkPerformance {
  id: string | null;
  title: string;
  clicks: number;
  /** This link's share of all clicks in the window. Not a click-through rate. */
  share: number;
  /** Clicks on this link ÷ page views. Null when there were no views. */
  ctr: number | null;
  /** The link no longer exists; the clicks it earned still do. */
  deleted: boolean;
}

export const getTopLinks = cache(
  async (range: RangeId, limit = 10): Promise<LinkPerformance[]> => {
    const profile = await requireClaimedProfile();
    const window = resolveWindow(range, new Date(), new Date(profile.created_at));
    const supabase = await createClient();

    try {
      const [{ data, error }, overview] = await Promise.all([
        supabase.rpc("analytics_top_links", {
          p_from: iso(window.from),
          p_to: iso(window.to),
          p_limit: limit,
        }),
        getOverview(range),
      ]);
      if (error || !data) return [];

      const total = data.reduce((sum, row) => sum + Number(row.clicks ?? 0), 0);

      return data.map((row) => {
        const clicks = Number(row.clicks ?? 0);
        return {
          id: row.link_id,
          title: row.title,
          clicks,
          share: total === 0 ? 0 : Math.round((clicks / total) * 1000) / 10,
          ctr: clickThroughRate(clicks, overview.views),
          deleted: Boolean(row.deleted),
        };
      });
    } catch {
      return [];
    }
  },
);

/* ── Breakdowns ───────────────────────────────────────────────────────────── */

export interface Slice {
  key: string;
  label: string;
  views: number;
  share: number;
}

type Dimension = "source" | "device" | "country";

const labelFor = (dimension: Dimension, key: string): string => {
  if (dimension === "source") return sourceLabel(key);
  if (dimension === "device") return DEVICE_LABELS[key as Device] ?? key;
  return countryName(key);
};

export const getBreakdown = cache(
  async (range: RangeId, dimension: Dimension): Promise<Slice[]> => {
    const profile = await requireClaimedProfile();
    const window = resolveWindow(range, new Date(), new Date(profile.created_at));
    const supabase = await createClient();

    try {
      const { data, error } = await supabase.rpc("analytics_breakdown", {
        p_from: iso(window.from),
        p_to: iso(window.to),
        p_dimension: dimension,
      });
      if (error || !data) return [];

      const total = data.reduce((sum, row) => sum + Number(row.views ?? 0), 0);
      if (total === 0) return [];

      return data.map((row) => {
        const views = Number(row.views ?? 0);
        return {
          key: row.key,
          label: labelFor(dimension, row.key),
          views,
          share: Math.round((views / total) * 1000) / 10,
        };
      });
    } catch {
      return [];
    }
  },
);

/* ── Recent ───────────────────────────────────────────────────────────────── */

export interface RecentEvent {
  kind: "view" | "click";
  title: string | null;
  at: Date;
}

/**
 * The last few events, with no dimensions attached.
 *
 * Deliberately carries no source, device or country. Three dimensions on one
 * event describe a person; the same three aggregated over a week describe an
 * audience, and only the second is something a creator should be handed.
 */
export const getRecent = cache(async (limit = 8): Promise<RecentEvent[]> => {
  await requireClaimedProfile();
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("analytics_recent", { p_limit: limit });
    if (error || !data) return [];

    return data.map((row) => ({
      kind: row.kind === "click" ? ("click" as const) : ("view" as const),
      title: row.title,
      at: new Date(row.at),
    }));
  } catch {
    return [];
  }
});
