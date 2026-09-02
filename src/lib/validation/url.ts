import { z } from "zod";

/**
 * URLs a creator gives us.
 *
 * Every link on a ShowMe page is a URL somebody typed, and it ends up in an
 * `href` that other people click. Two things matter: the scheme must be one a
 * browser can safely navigate to, and the value must survive a round trip
 * through the URL parser unchanged, so that what is stored is what was meant.
 *
 * `javascript:`, `data:` and `vbscript:` are the ones that turn an href into
 * script execution, so the check is an allow-list of `http:` and `https:`
 * rather than a deny-list of the schemes we happen to have thought of.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_URL_LENGTH = 2048;

export type UrlProblem = "empty" | "too_long" | "unparseable" | "bad_protocol" | "no_host";

const PROBLEM_MESSAGES: Record<UrlProblem, string> = {
  empty: "Add a link.",
  too_long: "That link is too long.",
  unparseable: "That does not look like a valid link.",
  bad_protocol: "Links must start with http:// or https://.",
  no_host: "That link is missing a domain.",
};

/**
 * Add a scheme when someone typed a bare domain.
 *
 * People paste `instagram.com/name` far more often than they paste the scheme,
 * and refusing that is a worse experience than assuming https. Anything that
 * already carries a scheme is left exactly as typed, so this can never upgrade
 * or downgrade an explicit choice.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function checkUrl(input: string): UrlProblem | null {
  if (input.length === 0) return "empty";
  if (input.length > MAX_URL_LENGTH) return "too_long";

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return "unparseable";
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return "bad_protocol";
  // A hostname with no dot and no port is a bare word like "https://foo".
  if (parsed.hostname.length === 0 || !parsed.hostname.includes(".")) return "no_host";
  return null;
}

/** Normalizes, validates, and returns the parser's canonical serialization. */
export const urlSchema = z
  .string()
  .max(MAX_URL_LENGTH + 64, PROBLEM_MESSAGES.too_long)
  .transform(normalizeUrl)
  .superRefine((value, ctx) => {
    const problem = checkUrl(value);
    if (problem) ctx.addIssue({ code: "custom", message: PROBLEM_MESSAGES[problem] });
  })
  .transform((value) => new URL(value).toString());
