import type { PublicProfile } from "@/lib/public-page/types";

/**
 * What a creator page tells a search engine and a link preview.
 *
 * Pure, and separate from the route that emits it, because every rule here is
 * a judgement about text that is worth being able to test directly: what a
 * page is called when its owner has not named themselves, what it says when
 * there is no bio, and what happens to a bio with three line breaks in it.
 *
 * One rule governs all of it — nothing is invented. The description is the
 * creator's own words when they wrote any, and a plain factual sentence when
 * they did not. It never describes a person we know nothing about, never
 * lists keywords, and never contains a number from the analytics tables: a
 * `<meta>` tag is public, and view counts are not.
 */

/** The longest a description can be before previews start cutting it. */
const MAX_DESCRIPTION = 200;

/** Whitespace collapsed to single spaces. A meta tag is one line. */
const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * The name to call this person.
 *
 * Their display name, or their handle. Never a bare username without the `@`:
 * `8zevo` alone reads as a product code, where `@8zevo` reads as a person.
 */
export function pageName(profile: Pick<PublicProfile, "displayName" | "username">): string {
  const named = profile.displayName?.trim();
  return named && named.length > 0 ? named : `@${profile.username}`;
}

/**
 * The `<title>`, before the layout appends "· ShowMe".
 *
 * Both the name and the handle when they differ, because the two answer
 * different searches — somebody looking for "Zevo" and somebody who half
 * remembers "@8zevo" should both find the page. When there is no display name
 * the handle is the name, and repeating it would read as a stutter.
 */
export function pageTitle(profile: Pick<PublicProfile, "displayName" | "username">): string {
  const name = pageName(profile);
  const handle = `@${profile.username}`;
  return name === handle ? handle : `${name} (${handle})`;
}

/**
 * The description.
 *
 * The bio, when there is one, trimmed at a word boundary if it is long. When
 * there is not, a sentence that says what the page is and whose it is — which
 * is honest, and specific enough that a hundred creator pages do not all share
 * one description. What it deliberately is not is a description of the person:
 * we know nothing about them, and a generated "Creator, entrepreneur and
 * influencer" would be a fabrication printed under their name.
 */
export function pageDescription(
  profile: Pick<PublicProfile, "displayName" | "username" | "bio">,
): string {
  const bio = profile.bio ? oneLine(profile.bio) : "";
  if (bio.length > 0) return truncate(bio, MAX_DESCRIPTION);

  return `Check out ${pageName(profile)}'s links, socials and content on ShowMe.`;
}

/** Cut at the last space before the limit, so no word is left in halves. */
function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** `https://showme.at/8zevo` → `showme.at/8zevo`, for reading rather than linking. */
export const readableAddress = (origin: string, username: string): string =>
  `${origin.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${username}`;
