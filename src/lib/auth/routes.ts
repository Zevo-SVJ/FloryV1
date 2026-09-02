/**
 * Which routes need a session, and which need the absence of one.
 *
 * Declared in one place so the proxy and the layouts agree. The proxy uses it
 * for a fast redirect; the layouts use it as the check that actually counts.
 */

export const PROTECTED_PREFIXES = ["/dashboard", "/editor"] as const;

/** Signed-in visitors have no use for these. */
export const AUTH_ONLY_PREFIXES = ["/login", "/signup"] as const;

/** Where a signed-in visitor lands. */
export const AFTER_SIGN_IN = "/dashboard";

/** Where a signed-out visitor is sent, and where they come back from. */
export const SIGN_IN_PATH = "/login";

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

export const isAuthOnlyPath = (pathname: string): boolean =>
  AUTH_ONLY_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

/**
 * Build the sign-in URL that returns someone to where they were headed.
 *
 * Only same-site paths are carried through. Accepting an arbitrary `next`
 * value would turn the login page into an open redirect — a phishing link that
 * genuinely starts on showme.at.
 */
export function signInUrl(returnTo?: string | null): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return SIGN_IN_PATH;
  }
  return `${SIGN_IN_PATH}?next=${encodeURIComponent(returnTo)}`;
}

/** The inverse: read a `next` parameter without trusting it. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return AFTER_SIGN_IN;
  return value;
}
