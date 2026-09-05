import { SECTIONS } from "@/lib/lock/navigation";

/**
 * Which routes need a session, which need the absence of one, and where people
 * are sent when they do not have what a route asks for.
 *
 * Declared in one place so that the proxy, the layouts and the data access
 * layer agree. The proxy uses these for a fast redirect; the layouts and the
 * DAL use them as the check that actually counts.
 */

/** Every section lives behind the app shell, and the shell needs a session. */
export const PROTECTED_PREFIXES: readonly string[] = SECTIONS.map((s) => s.href);

/** Signed-in visitors have no use for these. */
export const AUTH_ONLY_PREFIXES = ["/login", "/signup"] as const;

/** Where a signed-in visitor lands. */
export const AFTER_SIGN_IN = "/dashboard";

/** Where a signed-out visitor is sent, and where they come back from. */
export const SIGN_IN_PATH = "/login";

/**
 * Where a link in a confirmation email comes back to.
 *
 * Named here rather than written out at the call site because it has to match a
 * value in the Supabase dashboard's redirect allowlist exactly — and a constant
 * is something the setup guide can point at.
 */
export const AUTH_CALLBACK_PATH = "/auth/callback";

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Paths where a session is worth refreshing.
 *
 * Derived from the rules above rather than written out again. `/` is included
 * because the entry page renders a signed-in state; everything else outside
 * these prefixes is static and would only be slowed down by a round trip to the
 * auth server.
 */
const SESSION_PATHS: readonly string[] = [...PROTECTED_PREFIXES, ...AUTH_ONLY_PREFIXES];

export const needsSession = (pathname: string): boolean =>
  pathname === "/" || SESSION_PATHS.some((prefix) => startsWithSegment(pathname, prefix));

export const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

export const isAuthOnlyPath = (pathname: string): boolean =>
  AUTH_ONLY_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

/**
 * A path on this site, or nothing.
 *
 * Both directions of the return-to flow go through this one function, and it
 * exists because the obvious version of the check is wrong. `startsWith("/")`
 * plus `!startsWith("//")` looks like it covers the cases and does not:
 * `/\evil.com` passes both and resolves to `https://evil.com/`, because a URL
 * parser treats a backslash after the leading slash exactly like a second
 * slash. That is a phishing link which genuinely begins on this origin, which
 * is the entire point of an open redirect.
 *
 * So the value is not pattern-matched, it is *resolved* against a throwaway
 * origin and accepted only if the result is still on that origin. That closes
 * the backslash forms, the protocol-relative forms, absolute URLs, and anything
 * else a parser would read as an authority. The normalized path is returned
 * rather than the caller's string, so what gets redirected to is what was
 * checked.
 */
const INTERNAL = "https://lock.invalid";

function samePath(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;

  /*
   * Trimmed first, and not only for tidiness. The URL parser strips surrounding
   * whitespace before resolving, so `"   "` parses as the base itself and comes
   * back as the path `/` — a same-origin answer, and the wrong one: a blank
   * parameter means "no destination", which should land on the dashboard rather
   * than on the entry page.
   */
  const trimmed = value.trim();
  if (trimmed === "") return null;

  try {
    const url = new URL(trimmed, INTERNAL);
    if (url.origin !== INTERNAL) return null;

    /*
     * And one more, which resolving alone does not catch: `/..//evil.com`
     * normalizes to the pathname `//evil.com` — still on this origin as far as
     * the parser is concerned, and protocol-relative the moment it is handed to
     * `redirect()`.
     */
    if (url.pathname.startsWith("//")) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Build the sign-in URL that returns somebody to where they were headed. */
export function signInUrl(returnTo?: string | null): string {
  const path = samePath(returnTo);
  return path ? `${SIGN_IN_PATH}?next=${encodeURIComponent(path)}` : SIGN_IN_PATH;
}

/**
 * The sign-in URL, carrying a reason it is being shown again.
 *
 * The key is one of `AuthErrorKey`; the sign-in page looks the sentence up.
 * Nothing a provider wrote travels in this parameter — see `auth-errors.ts`.
 */
export function signInUrlWithError(errorKey: string, returnTo?: string | null): string {
  const base = signInUrl(returnTo);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}error=${encodeURIComponent(errorKey)}`;
}

/**
 * Where an identity provider, or a link in an email, should come back to.
 *
 * Relative on purpose. The caller prefixes the origin, because the value has to
 * be absolute for the provider and `siteUrl()` is the one place that decides
 * what this deployment's origin is. `next` is sanitized here rather than at the
 * far end: it makes a round trip through somebody else's server, and what comes
 * back is checked again on arrival.
 */
export function authCallbackPath(returnTo?: string | null): string {
  const destination = samePath(returnTo) ?? AFTER_SIGN_IN;
  return `${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(destination)}`;
}

/** The inverse: read a `next` parameter without trusting it. */
export function safeReturnTo(value: string | null | undefined): string {
  return samePath(value) ?? AFTER_SIGN_IN;
}
