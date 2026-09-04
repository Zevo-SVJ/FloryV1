import type { Evidence, LinkMetric, PageMetrics, RecommendationAction } from "@/lib/optimize/types";

/**
 * The small amount every rule needs and none of them should each own.
 *
 * Chiefly: what "move this to the top" actually does, which is the one place
 * where an honest description of an action is harder than the action itself.
 */

/**
 * The links a visitor can actually see, and only those.
 *
 * Every rule that reasons about position works from this. A scheduled or
 * expired link has no position — it is not on the page a visitor is looking at
 * — so ranking it against links that are would be comparing a shelf against a
 * stockroom. The stale-link rule reads the full list instead, because a link
 * nobody can see is exactly what it is about.
 */
export const onPage = (links: LinkMetric[]): LinkMetric[] =>
  links.filter((item) => item.visible && item.position > 0);

/** Visible links, best first, ties broken by the order on the page. */
export const byClicks = (links: LinkMetric[]): LinkMetric[] =>
  onPage(links).sort((a, b) => b.clicks - a.clicks || a.position - b.position);

/** Visible links, in the order a visitor meets them. */
export const byPosition = (links: LinkMetric[]): LinkMetric[] =>
  onPage(links).sort((a, b) => a.position - b.position);

/**
 * Where a link would land if it moved to the top of its own section.
 *
 * Reordering happens **inside a block**, never across blocks, and this is why
 * the distinction is worth the function: a page can have several links
 * sections — "Latest", "Shop" — and silently lifting a link out of Shop into
 * Latest would be rearranging a creator's page rather than reordering it. The
 * brief for this phase is emphatic that nothing is changed by surprise, and a
 * link that changes section is a surprise.
 *
 * So the position a link can reach is the top of its own section, which is #1
 * on the overwhelmingly common one-section page and something honest like #3
 * on a page with a section above it. Every piece of copy that offers this
 * action names the number it will actually produce.
 */
export function topOfBlock(link: LinkMetric, links: LinkMetric[]): number {
  const first = byPosition(links).find((other) => other.blockId === link.blockId);
  return first ? first.position : link.position;
}

/** "Move to #1", or the truth when it is not #1. */
export function moveLabel(link: LinkMetric, links: LinkMetric[]): string {
  const destination = topOfBlock(link, links);
  return destination === 1 ? "Move to #1" : `Move to #${destination}`;
}

export function moveAction(link: LinkMetric, links: LinkMetric[]): RecommendationAction {
  const destination = topOfBlock(link, links);
  return {
    kind: "move_link_to_top",
    label: moveLabel(link, links),
    linkId: link.id,
    confirm: `Move “${link.title}” from #${link.position} to #${destination}?`,
  };
}

/** The two links either side of a comparison, phrased without causality. */
export const times = (a: number, b: number): string =>
  b === 0 ? "" : `${Math.round((a / b) * 10) / 10}×`;

export const evidence = (label: string, value: string): Evidence => ({ label, value });

/** The window, spelled the same way in every recommendation that mentions it. */
export const windowEvidence = (metrics: PageMetrics): Evidence =>
  evidence("Period", metrics.window.label);

export const analyticsAction = (label = "View analytics"): RecommendationAction => ({
  kind: "link",
  label,
  href: "/dashboard/analytics?range=30d",
});

export const editorAction = (label = "Open editor"): RecommendationAction => ({
  kind: "link",
  label,
  href: "/editor",
});
