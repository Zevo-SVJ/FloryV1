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

/* ── Email, for a contact icon ────────────────────────────────────────────── */

/**
 * `mailto:` is allowed in exactly one place: a social link.
 *
 * It is safe in an href in a way `javascript:` and `data:` are not — it hands
 * an address to the operating system rather than executing anything in the
 * page — but it is still not a *link*. A button on somebody's page that opens
 * a mail composer instead of a website is a surprise, so `links` keeps the
 * http(s) rule and only the contact row widens.
 *
 * The pattern refuses anything after the address. `mailto:` accepts headers
 * through `?subject=` and `?cc=`, and a creator's contact icon has no need of
 * them — while a newline inside one is the classic header injection.
 */
const MAILTO = /^mailto:[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"]+\.[a-zA-Z]{2,}$/;
const EMAIL = /^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"]+\.[a-zA-Z]{2,}$/;

export const isMailto = (value: string): boolean => MAILTO.test(value.trim());

export const isEmailAddress = (value: string): boolean => EMAIL.test(value.trim());

/** The address inside a `mailto:`, or the value unchanged if it is not one. */
export const emailFromMailto = (value: string): string =>
  value.trim().replace(/^mailto:/i, "");

/**
 * A social link's address: a web page, or an email.
 *
 * Mirrors the `social_links_url_scheme` constraint, which is the one that
 * decides. Returns null when the value is acceptable, matching `checkUrl`.
 */
export function checkSocialUrl(input: string): UrlProblem | null {
  const value = input.trim();
  if (value.length === 0) return "empty";
  if (isMailto(value)) return null;
  return checkUrl(value);
}

/**
 * Normalizes a social address, turning a bare email into a `mailto:`.
 *
 * Ordered so an email is recognised before `normalizeUrl` gets a chance to
 * prepend `https://` to it — `name@example.com` is a plausible hostname to a
 * URL parser and would sail through as a broken link.
 */
export function normalizeSocialUrl(input: string): string {
  const value = input.trim();
  if (value.length === 0) return "";
  if (isMailto(value)) return `mailto:${emailFromMailto(value)}`;
  if (isEmailAddress(value)) return `mailto:${value}`;
  return normalizeUrl(value);
}

/** The schema the server uses for a social link's address. */
export const socialUrlSchema = z
  .string()
  .max(MAX_URL_LENGTH + 64, PROBLEM_MESSAGES.too_long)
  .transform(normalizeSocialUrl)
  .superRefine((value, ctx) => {
    const problem = checkSocialUrl(value);
    if (problem) ctx.addIssue({ code: "custom", message: PROBLEM_MESSAGES[problem] });
  });
