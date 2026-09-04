import { MIN_CLICKS, MIN_LINKS, MIN_VIEWS } from "@/lib/optimize/thresholds";
import type { PageMetrics } from "@/lib/optimize/types";

/**
 * A score a creator can argue with.
 *
 * The failure mode this is written against is the scientific-looking number:
 * a 78 that averages six arbitrary quantities, cannot be explained, and
 * changes for reasons nobody can name. So the score here is not a formula
 * applied to the page — it is a list of checks, each with a weight, each
 * either passed, half-passed or failed, each with the sentence that says why.
 * The number is the arithmetic on that list and nothing more, and the list is
 * shown next to it.
 *
 * Two consequences worth stating.
 *
 * A check with no data behind it is **removed from the denominator** rather
 * than scored as zero. A page with three hundred views and no clicks yet has
 * not failed its ordering check; the ordering check does not apply to it. This
 * is the difference between a score that punishes a new page and one that
 * describes it.
 *
 * And there is no score at all below `MIN_VIEWS`. Everything that makes this
 * number mean anything — click-through rate, which link leads, whether the
 * order agrees with the clicks — is a statement about visitors, and a page
 * that has not had a hundred of them has nothing to say. "Not enough data yet"
 * is the honest output, and `null` is how it travels.
 */

export type Verdict = "good" | "fair" | "poor";

export interface ScoreCheck {
  id: string;
  label: string;
  /** Out of `weight`, before rounding. */
  earned: number;
  weight: number;
  verdict: Verdict;
  /** One sentence with the actual figure in it. */
  detail: string;
}

export interface OptimizationScore {
  /** 0–100, or null when the page has not been seen enough to have one. */
  value: number | null;
  /** Why there is no score, when there is none. */
  blockedBy?: { needed: number; have: number; what: string };
  checks: ScoreCheck[];
  /** Checks that could not be evaluated, and what each is waiting for. */
  pending: { label: string; waitingFor: string }[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function optimizationScore(metrics: PageMetrics): OptimizationScore {
  const checks: ScoreCheck[] = [];
  const pending: { label: string; waitingFor: string }[] = [];

  /* ── Profile completeness ─────────────────────────────────────────────────
   *
   * Always applicable: it needs no visitors, only the page itself. Weighted
   * below the performance checks because a complete profile is table stakes
   * rather than an achievement.
   */
  const { hasAvatar, hasDisplayName, hasBio, socialCount } = metrics.profile;
  const profileParts = [
    { has: hasAvatar, points: 6, name: "a photo" },
    { has: hasDisplayName, points: 5, name: "a name" },
    { has: hasBio, points: 5, name: "a bio" },
    { has: socialCount > 0, points: 4, name: "social links" },
  ];
  const profileEarned = profileParts.reduce((sum, part) => sum + (part.has ? part.points : 0), 0);
  const missing = profileParts.filter((part) => !part.has).map((part) => part.name);
  checks.push({
    id: "profile",
    label: "Profile",
    earned: profileEarned,
    weight: 20,
    verdict: profileEarned === 20 ? "good" : profileEarned >= 11 ? "fair" : "poor",
    detail:
      missing.length === 0
        ? "Photo, name, bio and social links are all set."
        : `Missing ${listOf(missing)}.`,
  });

  /* ── Page hygiene ─────────────────────────────────────────────────────────
   *
   * Also applicable without visitors: an expired link sitting on the page is
   * a fact about the page. Nothing here is about performance, which is why it
   * is worth ten points rather than thirty.
   */
  const expired = metrics.links.filter((link) => link.expired).length;
  const scheduled = metrics.links.filter((link) => link.scheduled).length;
  const hygieneEarned = expired === 0 ? 10 : Math.max(0, 10 - expired * 4);
  checks.push({
    id: "hygiene",
    label: "Housekeeping",
    earned: hygieneEarned,
    weight: 10,
    verdict: expired === 0 ? "good" : expired === 1 ? "fair" : "poor",
    detail:
      expired === 0
        ? scheduled > 0
          ? `Nothing has expired. ${scheduled} link${scheduled === 1 ? "" : "s"} scheduled for later.`
          : "No expired links on the page."
        : `${expired} link${expired === 1 ? " has" : "s have"} passed their end date and no longer appear.`,
  });

  /* ── Click-through rate ───────────────────────────────────────────────────
   *
   * The bands below are ShowMe's own, and the interface says so. They are not
   * an industry benchmark — we have not measured one and quoting a number we
   * have not measured is exactly the kind of invention this phase is meant to
   * avoid. What they are is a statement about what this kind of page is for: a
   * page whose whole purpose is to send people somewhere, where four visits in
   * five produce no click, is not doing its job, and that judgement needs no
   * outside data to make.
   */
  if (metrics.views >= MIN_VIEWS && metrics.ctr !== null) {
    const ctr = metrics.ctr;
    const earned = ctr >= 30 ? 25 : ctr >= 15 ? 25 * (0.5 + ((ctr - 15) / 15) * 0.5) : 25 * (ctr / 15) * 0.5;
    checks.push({
      id: "ctr",
      label: "Click-through rate",
      earned: Math.round(clamp01(earned / 25) * 25 * 10) / 10,
      weight: 25,
      verdict: ctr >= 30 ? "good" : ctr >= 15 ? "fair" : "poor",
      detail: `${ctr}% of visits produced a click over the ${metrics.window.label.toLowerCase()}.`,
    });
  } else {
    pending.push({
      label: "Click-through rate",
      waitingFor: `${MIN_VIEWS - metrics.views} more views`,
    });
  }

  /* ── Where the best link sits ─────────────────────────────────────────────
   *
   * The single most actionable thing this product can measure, so it carries
   * the most weight of any performance check.
   */
  const ranked = [...metrics.links].sort((a, b) => b.clicks - a.clicks || a.position - b.position);
  const best = ranked[0];

  if (metrics.clicks >= MIN_CLICKS && metrics.links.length >= MIN_LINKS && best && best.clicks > 0) {
    // Full marks at #1, most of them at #2, falling away after that.
    const earned = best.position === 1 ? 20 : best.position === 2 ? 15 : Math.max(0, 12 - (best.position - 3) * 3);
    checks.push({
      id: "top_link_position",
      label: "Best link's position",
      earned,
      weight: 20,
      // #4 earns 9 of 20, so calling it "fair" would have described the same
      // page two different ways in the same row.
      verdict: best.position <= 2 ? "good" : best.position === 3 ? "fair" : "poor",
      detail: `${best.title} takes ${best.share}% of clicks and sits at #${best.position}.`,
    });

    /* ── Featured ───────────────────────────────────────────────────────────
     *
     * Only scored when one link genuinely leads. On a page where the top two
     * are within a few points of each other there is no "primary" link to
     * feature, and marking the page down for not picking one arbitrarily
     * would be scoring a decision nobody should make.
     */
    const second = ranked[1];
    const leadsClearly = !second || second.clicks === 0 || best.clicks >= second.clicks * 1.5;
    if (leadsClearly) {
      checks.push({
        id: "featured",
        label: "Primary link",
        earned: best.isFeatured ? 10 : 3,
        weight: 10,
        verdict: best.isFeatured ? "good" : "fair",
        detail: best.isFeatured
          ? `${best.title} is featured, and it is your most clicked link.`
          : `${best.title} leads on clicks but is not featured.`,
      });
    } else {
      pending.push({
        label: "Primary link",
        waitingFor: "one link to lead the others clearly",
      });
    }

    /* ── Does the order agree with the clicks ────────────────────────────────
     *
     * Counted as pairs rather than as a correlation coefficient, because a
     * pair is something that can be shown: "two links are above links that
     * get more clicks than they do". Ties count as agreement — two links with
     * no clicks between them carry no information about which should be
     * first, and penalising their order would be inventing a preference.
     */
    const byPosition = [...metrics.links].sort((a, b) => a.position - b.position);
    let inversions = 0;
    let pairs = 0;
    for (let i = 0; i < byPosition.length; i++) {
      for (let j = i + 1; j < byPosition.length; j++) {
        pairs++;
        const above = byPosition[i];
        const below = byPosition[j];
        if (above && below && below.clicks > above.clicks) inversions++;
      }
    }
    const agreement = pairs === 0 ? 1 : 1 - inversions / pairs;
    checks.push({
      id: "ordering",
      label: "Order vs clicks",
      earned: Math.round(agreement * 15 * 10) / 10,
      weight: 15,
      verdict: agreement >= 0.85 ? "good" : agreement >= 0.6 ? "fair" : "poor",
      detail:
        inversions === 0
          ? "Every link sits above the ones that get fewer clicks."
          : `${inversions} of ${pairs} link pairs are in the opposite order to their clicks.`,
    });
  } else {
    const waitingFor =
      metrics.links.length < MIN_LINKS
        ? `${MIN_LINKS} links on the page`
        : `${Math.max(0, MIN_CLICKS - metrics.clicks)} more clicks`;
    pending.push({ label: "Best link's position", waitingFor });
    pending.push({ label: "Primary link", waitingFor });
    pending.push({ label: "Order vs clicks", waitingFor });
  }

  /* ── The number ───────────────────────────────────────────────────────────
   *
   * No score until the page has been seen. Everything that makes it mean
   * anything is a statement about visitors.
   */
  if (metrics.views < MIN_VIEWS) {
    return {
      value: null,
      blockedBy: { needed: MIN_VIEWS, have: metrics.views, what: "views" },
      checks,
      pending,
    };
  }

  const weight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + check.earned, 0);

  return {
    value: weight === 0 ? null : Math.round((earned / weight) * 100),
    checks,
    pending,
  };
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
