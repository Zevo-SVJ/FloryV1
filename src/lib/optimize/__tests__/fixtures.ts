import type { DeviceMetric, LinkMetric, PageMetrics } from "../types.ts";

/**
 * Pages to run the rules against.
 *
 * The whole engine is a pure function of `PageMetrics`, which is what makes
 * these tests possible without a database — and what makes it possible to
 * assert the thing that matters most about this feature: that it stays quiet
 * when it does not know.
 */

const NOW = new Date("2026-09-04T12:00:00.000Z");

export const link = (over: Partial<LinkMetric> = {}): LinkMetric => ({
  id: over.id ?? `00000000-0000-4000-8000-${String(Math.random()).slice(2, 14)}`,
  title: "A link",
  position: 1,
  blockId: "b1",
  blockTitle: null,
  blockIndex: 0,
  positionInBlock: 0,
  clicks: 0,
  share: 0,
  isFeatured: false,
  ageDays: 90,
  expired: false,
  scheduled: false,
  visible: true,
  ...over,
});

export const device = (over: Partial<DeviceMetric> = {}): DeviceMetric => ({
  device: "mobile",
  label: "Mobile",
  views: 0,
  clicks: 0,
  ctr: null,
  ...over,
});

export function metrics(over: Partial<PageMetrics> = {}): PageMetrics {
  const links = over.links ?? [];
  const clicks = over.clicks ?? links.reduce((sum, item) => sum + item.clicks, 0);
  const views = over.views ?? 1000;

  return {
    window: { from: new Date(NOW.getTime() - 30 * 86_400_000), to: NOW, days: 30, label: "last 30 days" },
    views,
    clicks,
    ctr: views === 0 ? null : Math.round((clicks / views) * 1000) / 10,
    previous: null,
    links,
    devices: [],
    sources: [],
    profile: { hasAvatar: true, hasDisplayName: true, hasBio: true, socialCount: 3 },
    at: NOW,
    ...over,
  };
}

/**
 * Positions and shares, computed rather than typed.
 *
 * Hand-writing a `share` beside a `clicks` in every fixture is how a test ends
 * up asserting against arithmetic nobody checked. This derives both from the
 * order and the counts, exactly as `queries.ts` does.
 */
export function page(
  entries: { title: string; clicks: number; over?: Partial<LinkMetric> }[],
  over: Partial<PageMetrics> = {},
): PageMetrics {
  const total = entries.reduce((sum, entry) => sum + entry.clicks, 0);

  const links = entries.map((entry, index) =>
    link({
      id: `00000000-0000-4000-8000-00000000000${index.toString(16)}`,
      title: entry.title,
      position: index + 1,
      positionInBlock: index,
      clicks: entry.clicks,
      share: total === 0 ? 0 : Math.round((entry.clicks / total) * 1000) / 10,
      ...entry.over,
    }),
  );

  return metrics({ links, clicks: total, ...over });
}
