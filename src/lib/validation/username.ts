import { z } from "zod";
import { isReservedUsername } from "@/lib/validation/reserved";

/**
 * Usernames.
 *
 * A username is the whole address — `showme.at/alex` — so it has to survive
 * being typed off a phone screen, read aloud, and pasted into a browser bar.
 * That rules out uppercase (paths are case-sensitive, so `Alex` and `alex`
 * would be two pages) and punctuation that reads as structure: dots look like
 * file extensions, slashes look like another segment.
 *
 * Underscores and hyphens are allowed because `john_doe` and `john-doe` are
 * names people already have elsewhere and expect to keep.
 *
 * These rules exist twice: here, and as SQL in
 * `supabase/migrations/20260102000000_usernames_and_onboarding.sql`. The copy
 * in the database is the one that decides; this one exists so the browser can
 * answer instantly. `supabase/tests/02_usernames.sql` checks they agree.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

/** Lowercase letters, digits, underscore and hyphen; alphanumeric at the ends. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

/** Two separators in a row read as a typo, whichever two. */
const ADJACENT_SEPARATORS = /[_-]{2}/;

/** The shape of a name the system assigns before someone chooses their own. */
const PLACEHOLDER_PATTERN = /^u[0-9a-f]{29}$/;

/**
 * Fold what someone typed into its canonical form — and nothing else.
 *
 * Case and surrounding whitespace are noise, so they go. Everything else stays,
 * including the characters that make a name invalid: quietly turning
 * "john doe" into "johndoe" would hand somebody a name they did not ask for
 * and did not check. The validator refuses it instead, and says why.
 *
 * NFKC first, so that a fullwidth `ａlex` and an ASCII `alex` cannot be two
 * different accounts that look identical in a browser tab.
 */
export function normalizeUsername(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase();
}

export type UsernameProblem =
  | "too_short"
  | "too_long"
  | "invalid_characters"
  | "bad_edges"
  | "adjacent_separators"
  | "reserved";

const PROBLEM_MESSAGES: Record<UsernameProblem, string> = {
  too_short: `Usernames need at least ${USERNAME_MIN} characters.`,
  too_long: `Usernames can be at most ${USERNAME_MAX} characters.`,
  invalid_characters: "Use letters, numbers, underscores and hyphens only.",
  bad_edges: "Usernames must start and end with a letter or number.",
  adjacent_separators: "Usernames cannot contain two separators in a row.",
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
  if (!/^[a-z0-9_-]+$/.test(username)) return "invalid_characters";
  if (!/^[a-z0-9]/.test(username) || !/[a-z0-9]$/.test(username)) return "bad_edges";
  if (ADJACENT_SEPARATORS.test(username)) return "adjacent_separators";
  // A placeholder belongs to the one account it was derived from. Claiming
  // somebody else's would take over the address they are about to be given.
  if (PLACEHOLDER_PATTERN.test(username)) return "reserved";
  if (isReservedUsername(username)) return "reserved";
  return null;
}

export const isValidUsername = (username: string): boolean =>
  checkUsername(username) === null;

/** True for a name the system assigned, which means onboarding is unfinished. */
export const isPlaceholderUsername = (username: string): boolean =>
  PLACEHOLDER_PATTERN.test(username);

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
 * What a URL segment turned out to be.
 *
 * `/Alex`, `/alex` and `/ALEX` are one page, so only one of them may render it
 * — the rest redirect. `/john.doe` is not a username at all and gets a 404
 * rather than a redirect to `/johndoe`, which would be inventing an address
 * nobody asked for.
 */
export type PathUsername =
  | { kind: "canonical"; username: string }
  | { kind: "redirect"; username: string }
  | { kind: "miss" };

export function usernameFromPath(segment: string): PathUsername {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return { kind: "miss" };
  }

  const normalized = normalizeUsername(decoded);
  if (!isValidUsername(normalized)) return { kind: "miss" };

  return normalized === decoded
    ? { kind: "canonical", username: normalized }
    : { kind: "redirect", username: normalized };
}
