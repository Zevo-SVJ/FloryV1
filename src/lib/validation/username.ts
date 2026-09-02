import { z } from "zod";
import { isReservedUsername } from "@/lib/validation/reserved";

/**
 * Usernames.
 *
 * A username is the whole address — `showme.at/alex` — so it has to survive
 * being typed off a phone screen, read aloud, and pasted into a browser bar.
 * That rules out uppercase (URLs are compared case-sensitively after the host,
 * so `Alex` and `alex` would be two pages), dots (they read as file
 * extensions), and hyphens at the edges.
 *
 * Normalization happens before validation, always, on the server. The database
 * enforces the same rules with a CHECK constraint and a trigger, so a row that
 * skips this module cannot exist.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/** Lowercase letters, digits and underscores. Must start with a letter or digit. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/;

/**
 * Fold anything a person might type into the canonical form.
 *
 * Unicode is normalized first so that visually identical strings compare
 * equal, then anything that is not a permitted character is dropped rather
 * than replaced — silently turning "alex smith" into "alex_smith" would hand
 * someone a name they did not ask for.
 */
export function normalizeUsername(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

export type UsernameProblem =
  | "too_short"
  | "too_long"
  | "invalid_characters"
  | "bad_edges"
  | "consecutive_underscores"
  | "reserved";

const PROBLEM_MESSAGES: Record<UsernameProblem, string> = {
  too_short: `Usernames need at least ${USERNAME_MIN} characters.`,
  too_long: `Usernames can be at most ${USERNAME_MAX} characters.`,
  invalid_characters: "Use lowercase letters, numbers and underscores only.",
  bad_edges: "Usernames must start and end with a letter or number.",
  consecutive_underscores: "Usernames cannot contain two underscores in a row.",
  reserved: "That username is reserved.",
};

export const usernameProblemMessage = (problem: UsernameProblem): string =>
  PROBLEM_MESSAGES[problem];

/**
 * Check an already-normalized username.
 *
 * Returns the first problem rather than a list: one clear sentence under a
 * field beats a wall of rules.
 */
export function checkUsername(username: string): UsernameProblem | null {
  if (username.length < USERNAME_MIN) return "too_short";
  if (username.length > USERNAME_MAX) return "too_long";
  if (!/^[a-z0-9_]+$/.test(username)) return "invalid_characters";
  if (!/^[a-z0-9]/.test(username) || !/[a-z0-9]$/.test(username)) return "bad_edges";
  if (username.includes("__")) return "consecutive_underscores";
  if (isReservedUsername(username)) return "reserved";
  return null;
}

export const isValidUsername = (username: string): boolean =>
  checkUsername(username) === null;

/**
 * The schema every server entry point uses.
 *
 * Normalizes first, so callers never have to remember to. A value that comes
 * out of this schema is safe to put in a URL and safe to store.
 */
export const usernameSchema = z
  .string()
  .max(120, "That username is too long.")
  .transform(normalizeUsername)
  .superRefine((username, ctx) => {
    const problem = checkUsername(username);
    if (problem) {
      ctx.addIssue({ code: "custom", message: usernameProblemMessage(problem) });
    }
  });

/**
 * A username taken straight from a URL segment.
 *
 * Public pages must not normalize-then-serve, or `/Alex`, `/alex` and `/a.lex`
 * would all render the same page under three addresses. This returns the
 * canonical form only when the input was already canonical; anything else is
 * a miss, and the route redirects or 404s rather than duplicating content.
 */
export function usernameFromPath(segment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }

  const normalized = normalizeUsername(decoded);
  if (normalized !== decoded) return null;
  return isValidUsername(normalized) ? normalized : null;
}
