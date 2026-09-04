import type { Device } from "@/lib/analytics/types";

/**
 * The vocabulary of Smart Optimization.
 *
 * One shape in — `PageMetrics` — and one shape out — `Recommendation`. Every
 * rule is a pure function between them, which is what makes the whole engine
 * testable without a database and what keeps recommendation logic out of React
 * components.
 *
 * Nothing here holds a visitor. `PageMetrics` is built entirely from the same
 * aggregates the analytics dashboard reads, and the finest grain anywhere in
 * it is a count.
 */

/* ── What a rule reads ────────────────────────────────────────────────────── */

/** One link on the page, with what the window says about it. */
export interface LinkMetric {
  id: string;
  title: string;
  /**
   * Where a visitor finds it, counting every live link on the page from the
   * top. One-based, because it is a number a creator reads: "#4".
   *
   * Blocks in their page order, links in theirs — the same walk the public
   * renderer does, so this is the position on the page rather than the
   * position in a table.
   *
   * **Zero for a link no visitor can currently see** — one that is scheduled
   * or has expired. Such a link is on the page in the editor and is worth a
   * word about, but it has no position, and giving it the number of whichever
   * link comes next produced two links called "#3" on the same screen.
   */
  position: number;
  /** Whether a visitor can see it right now. False for scheduled and expired. */
  visible: boolean;
  /** The block it lives in, and where that block sits among the link blocks. */
  blockId: string;
  blockTitle: string | null;
  blockIndex: number;
  /** Its position inside its own block, zero-based, as stored. */
  positionInBlock: number;

  clicks: number;
  /** Its share of every click the page received in the window, 0–100. */
  share: number;

  isFeatured: boolean;
  /** How long the link has existed, in whole days. */
  ageDays: number;
  /** The link's window has closed: it is on the page but nobody can see it. */
  expired: boolean;
  /** The link's window has not opened yet. */
  scheduled: boolean;
}

/** Views by one dimension value, as the analytics breakdown already reports. */
export interface DimensionSlice {
  key: string;
  label: string;
  views: number;
  /** 0–100. */
  share: number;
}

/** Views and clicks for one device, which is the one dimension both carry. */
export interface DeviceMetric {
  device: Device;
  label: string;
  views: number;
  clicks: number;
  /** Clicks ÷ views for this device, as a percentage. Null below the floor. */
  ctr: number | null;
}

export interface ProfileCompleteness {
  hasAvatar: boolean;
  hasDisplayName: boolean;
  hasBio: boolean;
  socialCount: number;
}

/**
 * Everything the rules are allowed to know.
 *
 * Assembled once per request by `queries.ts` and handed to every rule. A rule
 * that needs something not in here does not reach for the database — the field
 * is added here, where its provenance and its window are visible.
 */
export interface PageMetrics {
  /** The window every number below describes. One window, no mixing. */
  window: { from: Date; to: Date; days: number; label: string };

  views: number;
  clicks: number;
  /** Clicks ÷ views, as a percentage. Null when there were no views. */
  ctr: number | null;

  /**
   * The window of the same length immediately before this one, or null when
   * the account is not old enough to have one.
   */
  previous: { views: number; clicks: number } | null;

  links: LinkMetric[];
  devices: DeviceMetric[];
  sources: DimensionSlice[];
  profile: ProfileCompleteness;

  /** Evaluated at, so a recommendation can say when it was worked out. */
  at: Date;
}

/* ── What a rule returns ──────────────────────────────────────────────────── */

export const RECOMMENDATION_TYPES = [
  "HIGH_PERFORMING_LOW_POSITION",
  "TOP_LINK_NOT_FEATURED",
  "UNDERPERFORMING_LINK",
  "LINK_ORDER_OPPORTUNITY",
  "PROFILE_INCOMPLETE",
  "DEVICE_CTR_GAP",
  "SOURCE_CONCENTRATION",
  "STALE_LINK",
  "TRAFFIC_TREND",
] as const;

export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

/**
 * How much the data behind a recommendation is worth.
 *
 * Derived from sample size against the rule's own floor, never asserted by the
 * rule itself. Below the floor a rule returns null instead of returning
 * `early` — "we do not know yet" is a state of the page, not a weak claim.
 */
export const CONFIDENCE = ["early", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  early: "Early signal",
  medium: "Medium confidence",
  high: "High confidence",
};

export const PRIORITY = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITY)[number];

/**
 * A number the creator can check the recommendation against.
 *
 * Every recommendation carries the figures it was derived from, because a
 * recommendation whose reasoning is hidden is one nobody should follow. These
 * are rendered under a "Why this" disclosure, verbatim.
 */
export interface Evidence {
  label: string;
  value: string;
}

/**
 * Something the creator can do about it, in one press.
 *
 * `apply` actions change the page and are reversible; `link` actions navigate.
 * There is deliberately no action that deletes anything, and none that edits a
 * creator's words.
 */
export type RecommendationAction =
  | { kind: "move_link_to_top"; label: string; linkId: string; confirm: string }
  | { kind: "feature_link"; label: string; linkId: string; confirm: string }
  | { kind: "hide_link"; label: string; linkId: string; confirm: string }
  | {
      kind: "reorder_links";
      label: string;
      /** The full new ordering, as link ids in the order they will appear. */
      order: string[];
      confirm: string;
      /** What changes, in words, one line per moved link. */
      changes: string[];
    }
  | { kind: "link"; label: string; href: string };

export interface Recommendation {
  /**
   * Stable across evaluations for the same situation, because it is what a
   * dismissal and a history entry are keyed on. Type plus the resource it is
   * about — never a random id, which would make "do not show me this again"
   * last exactly one page load.
   */
  key: string;
  type: RecommendationType;
  title: string;
  /** Why this exists, in one or two sentences, containing the actual numbers. */
  explanation: string;
  priority: Priority;
  confidence: Confidence;
  evidence: Evidence[];
  /** The primary action, when there is a safe deterministic one. */
  action?: RecommendationAction;
  /** Secondary actions: always safe, usually navigation. */
  secondary?: RecommendationAction[];
  /** The link or profile this is about, so a deleted resource invalidates it. */
  targetLinkId?: string;
  evaluatedAt: string;
}

/** A rule: reads the metrics, returns what it found, or nothing. */
export interface Rule {
  type: RecommendationType;
  run: (metrics: PageMetrics) => Recommendation[];
}
