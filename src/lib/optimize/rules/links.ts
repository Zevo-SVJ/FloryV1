import {
  MIN_CLICKS,
  MIN_LINKS,
  MIN_LINK_CLICKS,
  STALE_DAYS,
  MIN_VIEWS,
  confidenceFor,
  weakest,
} from "@/lib/optimize/thresholds";
import {
  analyticsAction,
  byClicks,
  byPosition,
  onPage,
  editorAction,
  evidence,
  moveAction,
  times,
  topOfBlock,
  windowEvidence,
} from "@/lib/optimize/rules/shared";
import type { LinkMetric, PageMetrics, Recommendation, Rule } from "@/lib/optimize/types";

/**
 * The five rules that are about links, which is where the value of this
 * feature actually is.
 *
 * Each is an independent `Rule` — data in, recommendations or nothing out —
 * and they are grouped in one file only because they share their guards and
 * read the same three fields. Adding a sixth is adding an object to this file
 * and a name to `rules/index.ts`; nothing else in the product changes.
 *
 * Every one of them returns nothing when the page has not been clicked enough
 * for its numbers to mean anything, and none of them ever recommends deleting
 * a creator's work.
 */

/**
 * The guard every click-distribution rule shares.
 *
 * `onPage` rather than `links.length`: three links of which two are scheduled
 * for next month is a page with one link on it, and comparing it against
 * itself is not a comparison.
 */
function clickDataIsUsable(metrics: PageMetrics): boolean {
  return metrics.clicks >= MIN_CLICKS && onPage(metrics.links).length >= MIN_LINKS;
}

const at = (metrics: PageMetrics) => metrics.at.toISOString();

/* ── A link that outperforms where it sits ────────────────────────────────── */

/**
 * The headline rule, and the one the whole feature was described by: a link
 * that gets more clicks than anything else on the page while sitting halfway
 * down it.
 *
 * The guards are what keep it from being noise. The link must be the most
 * clicked on the page, it must beat whatever currently sits at the top by half
 * again, it must have ten clicks of its own, and moving it must actually
 * change where it is. The margin is what makes the distance irrelevant: a link
 * at #2 taking eight times the clicks of the link above it is as much an
 * opportunity as one at #6, and the rule that fired only below #3 was quietly
 * ignoring the clearest case there is.
 */
export const highPerformingLowPosition: Rule = {
  type: "HIGH_PERFORMING_LOW_POSITION",
  run(metrics) {
    if (!clickDataIsUsable(metrics)) return [];

    const ranked = byClicks(metrics.links);
    const best = ranked[0];
    const top = byPosition(metrics.links)[0];
    if (!best || !top || best.id === top.id) return [];
    if (best.clicks < MIN_LINK_CLICKS) return [];
    if (best.clicks < top.clicks * 1.5) return [];

    const destination = topOfBlock(best, metrics.links);
    // A link already at the top of its own section has nowhere to go. On a
    // page with a section above it, "the top" is the top of its own — see
    // `topOfBlock` for why that boundary is deliberate.
    if (destination >= best.position) return [];

    const pageConfidence = confidenceFor(metrics.clicks, MIN_CLICKS);
    const linkConfidence = confidenceFor(best.clicks, MIN_LINK_CLICKS);
    if (!pageConfidence || !linkConfidence) return [];

    return [
      {
        key: `HIGH_PERFORMING_LOW_POSITION:${best.id}`,
        type: "HIGH_PERFORMING_LOW_POSITION",
        title: `Move ${best.title} higher`,
        explanation:
          `${best.title} receives ${best.share}% of all clicks on your page — more than any ` +
          `other link — but a visitor has to scroll past ${best.position - 1} link` +
          `${best.position - 1 === 1 ? "" : "s"} to reach it.`,
        priority: best.share >= 35 || best.position >= 5 ? "high" : "medium",
        confidence: weakest(pageConfidence, linkConfidence),
        evidence: [
          evidence("Clicks on this link", best.clicks.toLocaleString()),
          evidence("Share of all clicks", `${best.share}%`),
          evidence("Current position", `#${best.position}`),
          evidence(
            "Compared with #1",
            top.clicks === 0
              ? `${top.title} has no clicks in this period`
              : `${times(best.clicks, top.clicks)} the clicks of ${top.title}`,
          ),
          windowEvidence(metrics),
        ],
        action: moveAction(best, metrics.links),
        secondary: [analyticsAction()],
        targetLinkId: best.id,
        evaluatedAt: at(metrics),
      },
    ];
  },
};

/* ── A clear favourite that is not featured ───────────────────────────────── */

/**
 * Featuring is presentation, so this only fires when there is genuinely a
 * primary link to promote. On a page where the top two links are within half
 * again of each other there is no favourite, and picking one would be
 * inventing a preference on the creator's behalf.
 */
export const topLinkNotFeatured: Rule = {
  type: "TOP_LINK_NOT_FEATURED",
  run(metrics) {
    if (!clickDataIsUsable(metrics)) return [];

    const ranked = byClicks(metrics.links);
    const best = ranked[0];
    const second = ranked[1];
    if (!best || best.clicks < MIN_LINK_CLICKS) return [];
    // Already featured. The brief is explicit: do not say it twice.
    if (best.isFeatured) return [];
    if (second && second.clicks > 0 && best.clicks < second.clicks * 1.5) return [];

    const pageConfidence = confidenceFor(metrics.clicks, MIN_CLICKS);
    const linkConfidence = confidenceFor(best.clicks, MIN_LINK_CLICKS);
    if (!pageConfidence || !linkConfidence) return [];

    const featuredElsewhere = metrics.links.find((link) => link.isFeatured && link.id !== best.id);

    return [
      {
        key: `TOP_LINK_NOT_FEATURED:${best.id}`,
        type: "TOP_LINK_NOT_FEATURED",
        title: `Feature ${best.title}`,
        explanation:
          `${best.title} takes ${best.share}% of your clicks` +
          (second && second.clicks > 0
            ? `, ${times(best.clicks, second.clicks)} as many as ${second.title}` +
              (second.clicks >= MIN_LINK_CLICKS ? "" : "")
            : "") +
          `. Featuring it gives it more weight on the page.` +
          (featuredElsewhere ? ` ${featuredElsewhere.title} is currently the featured link.` : ""),
        priority: "medium",
        confidence: weakest(pageConfidence, linkConfidence),
        evidence: [
          evidence("Clicks on this link", best.clicks.toLocaleString()),
          evidence("Share of all clicks", `${best.share}%`),
          evidence("Currently featured", featuredElsewhere ? featuredElsewhere.title : "Nothing"),
          windowEvidence(metrics),
        ],
        action: {
          kind: "feature_link",
          label: "Feature this link",
          linkId: best.id,
          confirm: `Feature “${best.title}” on your page?`,
        },
        secondary: [analyticsAction()],
        targetLinkId: best.id,
        evaluatedAt: at(metrics),
      },
    ];
  },
};

/* ── A prominent link almost nobody uses ──────────────────────────────────── */

/**
 * Deliberately narrow, because "this link is not working" is the easiest thing
 * in this whole feature to say wrongly.
 *
 * It fires only for a link in the top three positions — a link at #9 with few
 * clicks is not a problem, it is a link at #9 — and only when some link below
 * it is doing several times better on a sample worth comparing against. It
 * also requires the link to have been on the page for the whole window, so a
 * link added on Tuesday is never called a failure on Wednesday.
 *
 * And it never suggests deleting anything. The primary action opens the
 * editor, because the useful question is whether the link still points
 * somewhere worth going.
 */
export const underperformingLink: Rule = {
  type: "UNDERPERFORMING_LINK",
  run(metrics) {
    if (!clickDataIsUsable(metrics)) return [];

    const positioned = byPosition(metrics.links);
    const ranked = byClicks(metrics.links);
    const best = ranked[0];
    if (!best || best.clicks < MIN_LINK_CLICKS) return [];

    const candidate = positioned
      .slice(0, 3)
      .filter((link) => link.ageDays >= metrics.window.days)
      .filter((link) => !link.scheduled && !link.expired)
      // Below a quarter of the page's best link, and beaten several times over
      // by something a visitor has to scroll to reach.
      .find((link) => {
        if (link.clicks * 4 > best.clicks) return false;
        const beatenByBelow = positioned
          .slice(positioned.indexOf(link) + 1)
          .some((other) => other.clicks >= MIN_LINK_CLICKS && other.clicks >= Math.max(link.clicks * 3, 3));
        return beatenByBelow;
      });

    if (!candidate) return [];

    const confidence = confidenceFor(metrics.clicks, MIN_CLICKS);
    if (!confidence) return [];

    const rival = positioned
      .slice(positioned.indexOf(candidate) + 1)
      .sort((a, b) => b.clicks - a.clicks)[0];

    return [
      {
        key: `UNDERPERFORMING_LINK:${candidate.id}`,
        type: "UNDERPERFORMING_LINK",
        title: `${candidate.title} is taking a prominent spot`,
        explanation:
          `${candidate.title} sits at #${candidate.position} and has ${candidate.clicks} click` +
          `${candidate.clicks === 1 ? "" : "s"} in this period` +
          (rival
            ? `, while ${rival.title} at #${rival.position} has ${rival.clicks}.`
            : ".") +
          " It may be worth checking where it points, or moving it further down.",
        priority: "medium",
        confidence,
        evidence: [
          evidence("Clicks on this link", candidate.clicks.toLocaleString()),
          evidence("Share of all clicks", `${candidate.share}%`),
          evidence("Position", `#${candidate.position}`),
          ...(rival ? [evidence(`${rival.title} at #${rival.position}`, `${rival.clicks} clicks`)] : []),
          windowEvidence(metrics),
        ],
        // Reviewing comes first on purpose. Hiding a link is available, and it
        // is reversible, but it is not the first thing to reach for.
        action: editorAction("Review this link"),
        secondary: [
          {
            kind: "hide_link",
            label: "Hide it for now",
            linkId: candidate.id,
            confirm: `Hide “${candidate.title}” from your page? Its clicks are kept, and you can show it again at any time.`,
          },
        ],
        targetLinkId: candidate.id,
        evaluatedAt: at(metrics),
      },
    ];
  },
};

/* ── The whole order ──────────────────────────────────────────────────────── */

/**
 * Ordering a section by how much its links are actually clicked.
 *
 * The sort is stable on the current order, so links with the same number of
 * clicks — most often zero — keep the arrangement the creator chose. That
 * matters: the data says nothing about which of two unclicked links should be
 * first, and shuffling them would be motion presented as insight.
 *
 * The rule holds its fire unless at least two links move. One link moving is
 * already covered, more precisely, by the rule above.
 */
export const linkOrderOpportunity: Rule = {
  type: "LINK_ORDER_OPPORTUNITY",
  run(metrics) {
    if (!clickDataIsUsable(metrics)) return [];
    if (metrics.clicks === 0) return [];

    const current = byPosition(metrics.links);

    /*
     * Reordered inside each block and then reassembled in block order, which
     * is what keeps a link in the section its creator put it in. Only links a
     * visitor can see take part: a scheduled link has no position to move
     * from, and the action leaves rows it was not told about exactly where
     * they are.
     */
    const blocks = new Map<string, LinkMetric[]>();
    for (const link of current) {
      const bucket = blocks.get(link.blockId);
      if (bucket) bucket.push(link);
      else blocks.set(link.blockId, [link]);
    }

    const proposed: LinkMetric[] = [];
    for (const bucket of blocks.values()) {
      proposed.push(...[...bucket].sort((a, b) => b.clicks - a.clicks));
    }

    const moved = proposed.filter((link, index) => current[index]?.id !== link.id);
    if (moved.length < 2) return [];

    const confidence = confidenceFor(metrics.clicks, MIN_CLICKS);
    if (!confidence) return [];

    const changes = proposed
      .map((link, index) => ({ link, to: index + 1 }))
      .filter(({ link, to }) => link.position !== to)
      .map(({ link, to }) => `${link.title}: #${link.position} → #${to}`);

    return [
      {
        key: "LINK_ORDER_OPPORTUNITY",
        type: "LINK_ORDER_OPPORTUNITY",
        title: "Reorder your links by how often they are clicked",
        explanation:
          `${changes.length} of your ${current.length} links would move. Links stay in the ` +
          "section you put them in, and any two with the same number of clicks keep the order you chose.",
        priority: "medium",
        confidence,
        evidence: [
          evidence("Clicks in this period", metrics.clicks.toLocaleString()),
          evidence("Links on the page", String(current.length)),
          evidence("Links that would move", String(changes.length)),
          windowEvidence(metrics),
        ],
        action: {
          kind: "reorder_links",
          label: "Apply this order",
          order: proposed.map((link) => link.id),
          confirm: `Reorder ${changes.length} link${changes.length === 1 ? "" : "s"}?`,
          changes,
        },
        secondary: [analyticsAction()],
        evaluatedAt: at(metrics),
      },
    ];
  },
};

/* ── Links nobody is using any more ───────────────────────────────────────── */

/**
 * Two different kinds of stale, kept apart because they need different words.
 *
 * An expired link is a fact — its end date has passed and no visitor can see
 * it — and it is on the page taking up a creator's attention. A silent link is
 * an inference, and a much weaker one, so it needs the page to have had real
 * traffic and the link to have been there for a month before it is worth
 * raising at all.
 */
export const staleLink: Rule = {
  type: "STALE_LINK",
  run(metrics) {
    const found: Recommendation[] = [];

    const expired = metrics.links.filter((link) => link.expired);
    if (expired.length > 0) {
      const first = expired[0];
      if (first) {
        found.push({
          key: "STALE_LINK:expired",
          type: "STALE_LINK",
          title:
            expired.length === 1
              ? `${first.title} has expired`
              : `${expired.length} links have expired`,
          explanation:
            expired.length === 1
              ? `${first.title} is still on your page but its end date has passed, so visitors no longer see it. Its clicks are kept either way.`
              : `${expired.map((link) => link.title).join(", ")} are still on your page but their end dates have passed, so visitors no longer see them.`,
          priority: "low",
          // Not an inference from a sample: the dates are on the rows.
          confidence: "high",
          evidence: [
            evidence("Expired links", String(expired.length)),
            evidence("Still visible to visitors", "No"),
          ],
          action: editorAction("Review in the editor"),
          targetLinkId: first.id,
          evaluatedAt: at(metrics),
        });
      }
    }

    if (metrics.views >= MIN_VIEWS && metrics.clicks >= MIN_CLICKS) {
      const silent = metrics.links
        .filter((link) => !link.expired && !link.scheduled)
        .filter((link) => link.clicks === 0 && link.ageDays >= STALE_DAYS);

      const first = silent[0];
      if (first) {
        found.push({
          key: `STALE_LINK:silent:${first.id}`,
          type: "STALE_LINK",
          title:
            silent.length === 1
              ? `${first.title} has had no clicks`
              : `${silent.length} links have had no clicks`,
          explanation:
            `Your page had ${metrics.clicks.toLocaleString()} clicks in this period and ` +
            (silent.length === 1
              ? `${first.title}, which has been on the page for ${first.ageDays} days, received none of them.`
              : `${silent.length} links that have been up for a month or more received none of them.`) +
            " A quiet link is not necessarily a bad one — but it is worth a look.",
          priority: "low",
          confidence: confidenceFor(metrics.clicks, MIN_CLICKS) ?? "early",
          evidence: [
            evidence("Clicks on the page", metrics.clicks.toLocaleString()),
            evidence("Clicks on this link", "0"),
            evidence("Days on the page", String(first.ageDays)),
            windowEvidence(metrics),
          ],
          action: editorAction("Review in the editor"),
          targetLinkId: first.id,
          evaluatedAt: at(metrics),
        });
      }
    }

    return found;
  },
};
