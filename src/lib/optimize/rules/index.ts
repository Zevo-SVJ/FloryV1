import {
  highPerformingLowPosition,
  linkOrderOpportunity,
  staleLink,
  topLinkNotFeatured,
  underperformingLink,
} from "@/lib/optimize/rules/links";
import { deviceCtrGap, sourceConcentration, trafficTrend } from "@/lib/optimize/rules/audience";
import { profileIncomplete } from "@/lib/optimize/rules/page";
import type { Rule } from "@/lib/optimize/types";

/**
 * Every rule, in the order they are evaluated.
 *
 * Nine of them, and that is meant to stay roughly true. Twenty weak rules
 * produce a page nobody reads and a creator who learns to ignore the section;
 * the value here is that everything on the page is worth acting on. Adding a
 * tenth means being able to say what a creator would do differently because of
 * it, and what sample size makes it true.
 *
 * Order affects nothing — `engine.ts` ranks the output — so this list reads
 * top-down as most to least consequential.
 */
export const RULES: Rule[] = [
  highPerformingLowPosition,
  topLinkNotFeatured,
  linkOrderOpportunity,
  underperformingLink,
  deviceCtrGap,
  profileIncomplete,
  staleLink,
  sourceConcentration,
  trafficTrend,
];
