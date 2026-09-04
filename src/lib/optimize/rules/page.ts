import { editorAction, evidence } from "@/lib/optimize/rules/shared";
import type { Rule } from "@/lib/optimize/types";

/**
 * The one rule that needs no visitors at all.
 *
 * A missing bio is a fact about the page, not an inference from a sample, so
 * this fires from the first day and its confidence is `high` for a reason
 * that has nothing to do with sample size: there is nothing being estimated.
 *
 * What it deliberately does not say is what a bio is worth. "Adding a bio
 * increases clicks by 12%" is the sort of sentence this product would have to
 * have measured to be allowed to write, and it has not. It says what is
 * missing and what a visitor uses it for, and leaves the decision where it
 * belongs.
 */
export const profileIncomplete: Rule = {
  type: "PROFILE_INCOMPLETE",
  run(metrics) {
    const { hasAvatar, hasDisplayName, hasBio, socialCount } = metrics.profile;

    /*
     * Two forms of each name, because they sit in different sentences. "Your
     * page has no a photo" is what one form produces, and a product that
     * writes that sentence is a product nobody reads twice.
     */
    const missing = [
      !hasDisplayName && {
        noun: "display name",
        phrase: "a display name",
        why: "so the page is headed by your name rather than your handle",
      },
      !hasAvatar && {
        noun: "photo",
        phrase: "a photo",
        why: "so somebody arriving from a bio link recognises the page",
      },
      !hasBio && {
        noun: "bio",
        phrase: "a bio",
        why: "so a visitor knows who the page belongs to before they choose a link",
      },
      socialCount === 0 && {
        noun: "social links",
        phrase: "social links",
        why: "so people can follow you as well as click through",
      },
    ].filter((item): item is { noun: string; phrase: string; why: string } => item !== false);

    if (missing.length === 0) return [];

    const first = missing[0];
    if (!first) return [];

    /*
     * Priority by what is actually missing rather than by how many things are.
     * A page with no name and no photo is unrecognisable; a page with
     * everything but social links is complete enough to be getting on with.
     */
    const priority = !hasDisplayName || !hasAvatar ? "high" : !hasBio ? "medium" : "low";

    const nouns = missing.map((item) => item.noun);
    const list =
      nouns.length === 1
        ? nouns[0]
        : `${nouns.slice(0, -1).join(", ")} and ${nouns[nouns.length - 1]}`;

    return [
      {
        key: `PROFILE_INCOMPLETE:${nouns.join("|")}`,
        type: "PROFILE_INCOMPLETE",
        title: missing.length === 1 ? `Add ${first.phrase}` : "Finish your profile",
        explanation:
          `Your page has no ${list}. ` +
          `${first.phrase.charAt(0).toUpperCase()}${first.phrase.slice(1)} is worth adding ${first.why}.`,
        priority,
        // Nothing is being estimated: these fields are either set or they are not.
        confidence: "high",
        evidence: [
          evidence("Display name", hasDisplayName ? "Set" : "Not set"),
          evidence("Photo", hasAvatar ? "Set" : "Not set"),
          evidence("Bio", hasBio ? "Set" : "Not set"),
          evidence("Social links", socialCount === 0 ? "None" : String(socialCount)),
        ],
        action: editorAction(missing.length === 1 ? `Add ${first.phrase}` : "Open editor"),
        evaluatedAt: metrics.at.toISOString(),
      },
    ];
  },
};
