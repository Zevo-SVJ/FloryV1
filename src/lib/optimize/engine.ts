import { RULES } from "@/lib/optimize/rules";
import { optimizationScore, type OptimizationScore } from "@/lib/optimize/score";
import { MIN_CLICKS, MIN_VIEWS } from "@/lib/optimize/thresholds";
import type { PageMetrics, Priority, Recommendation, Confidence } from "@/lib/optimize/types";

/**
 * Running the rules and putting the results in order.
 *
 * Pure, and deliberately so: metrics and a set of dismissed keys go in, a
 * report comes out. Nothing here reads a database, which means the whole
 * decision surface of Smart Optimization can be tested by handing it numbers
 * — including the numbers that should produce no recommendations at all,
 * which are the ones a feature like this gets wrong.
 *
 * A rule that throws is skipped rather than allowed to take the page down. The
 * rules are pure functions over data that has already been shaped, so this
 * should never happen; it costs three lines and it means a creator with an odd
 * page still sees the other eight rules' output.
 */

export type OptimizationState = "empty" | "learning" | "ready";

export interface OptimizationReport {
  state: OptimizationState;
  score: OptimizationScore;
  /** Ranked, with dismissed keys removed. */
  recommendations: Recommendation[];
  /** Currently suppressed, so the interface can offer them back. */
  dismissed: Recommendation[];
  /** How many of the visible ones can be acted on in one press. */
  opportunities: number;
  metrics: PageMetrics;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, early: 2 };

/** Actions that change the page in one press, as opposed to navigating. */
export const isApplyAction = (recommendation: Recommendation): boolean =>
  recommendation.action !== undefined && recommendation.action.kind !== "link";

/**
 * Whether this asks the creator to change something.
 *
 * The distinction the interface groups by, and it is not the same as
 * `isApplyAction`. "Add a photo" and "Summer sale has expired" cannot be done
 * in one press — they open the editor — but they are still things to do, and
 * filing them under "nothing to do about these" alongside "your views are up"
 * was wrong in a way a creator would notice immediately.
 *
 * A recommendation with no primary action is one whose only offer is "View
 * analytics", which is exactly the set that is purely informational.
 */
export const asksForAChange = (recommendation: Recommendation): boolean =>
  recommendation.action !== undefined;

export function evaluate(
  metrics: PageMetrics,
  dismissedKeys: ReadonlySet<string> = new Set(),
): OptimizationReport {
  const found: Recommendation[] = [];

  for (const rule of RULES) {
    try {
      found.push(...rule.run(metrics));
    } catch {
      // One rule's problem is not the page's problem.
    }
  }

  const ranked = found.sort(compare);
  const visible = ranked.filter((item) => !dismissedKeys.has(item.key));
  const dismissed = ranked.filter((item) => dismissedKeys.has(item.key));

  return {
    state: stateOf(metrics),
    score: optimizationScore(metrics),
    recommendations: visible,
    dismissed,
    opportunities: visible.filter(asksForAChange).length,
    metrics,
  };
}

/**
 * Most useful first.
 *
 * Priority is the product judgement about impact, confidence is what the data
 * will support, and a recommendation that can be acted on in one press beats
 * one that cannot when the two are otherwise equal — because it is the one
 * where reading the card and doing something about it are the same action.
 */
function compare(a: Recommendation, b: Recommendation): number {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
    Number(isApplyAction(b)) - Number(isApplyAction(a)) ||
    a.key.localeCompare(b.key)
  );
}

/**
 * Which of the three things this page is.
 *
 * `empty` has never been visited: there is nothing to learn from and the
 * interface says so without a number anywhere on it. `learning` has visitors
 * but not enough of them for a score, and shows what it is waiting for.
 * `ready` is a page whose numbers mean something.
 */
function stateOf(metrics: PageMetrics): OptimizationState {
  if (metrics.views === 0 && metrics.clicks === 0) return "empty";
  if (metrics.views < MIN_VIEWS) return "learning";
  return "ready";
}

/**
 * What a page in the `learning` state is waiting for, in words.
 *
 * Shown instead of a score, so the empty state is a fact a creator can watch
 * change rather than a shrug. Both numbers are real counts against the
 * published thresholds.
 */
export function whatIsMissing(metrics: PageMetrics): string[] {
  const waiting: string[] = [];

  if (metrics.views < MIN_VIEWS) {
    waiting.push(
      `${(MIN_VIEWS - metrics.views).toLocaleString()} more views for an optimization score`,
    );
  }
  if (metrics.clicks < MIN_CLICKS) {
    waiting.push(
      `${(MIN_CLICKS - metrics.clicks).toLocaleString()} more clicks before your links can be compared`,
    );
  }

  return waiting;
}
