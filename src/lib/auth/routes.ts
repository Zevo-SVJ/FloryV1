/**
 * Which routes need a session, and which need the absence of one.
 *
 * Declared in one place so the proxy and the layouts agree. The proxy uses it
 * for a fast redirect; the layouts use it as the check that actually counts.
 */

export const PROTECTED_PREFIXES = ["/dashboard", "/editor", "/onboarding"] as const;

/** Signed-in visitors have no use for these. */
export const AUTH_ONLY_PREFIXES = ["/login", "/signup"] as const;

/** Where a signed-in visitor lands. */
export const AFTER_SIGN_IN = "/dashboard";

/** Where an account that has not chosen a username is sent. */
export const ONBOARDING_PATH = "/onboarding";

/** Where a signed-out visitor is sent, and where they come back from. */
export const SIGN_IN_PATH = "/login";

/**
 * Where a link in an email comes back to.
 *
 * Named here rather than written out at the one call site, because it has to
 * match a value in the Supabase dashboard's redirect allowlist exactly — and a
 * constant is something `SETUP.md` can point at.
 */
export const AUTH_CALLBACK_PATH = "/auth/callback";

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Paths where a session is worth refreshing.
 *
 * Everything else — above all `/[username]`, the page this product exists to
 * serve — is read by strangers, and putting a Supabase round trip in front of
 * it would slow down the request that matters most to make a cookie fresher
 * for a visitor who has no cookie.
 *
 * The list is derived from the route rules above rather than written out
 * again, so adding a protected prefix is enough to keep its session alive. The
 * landing page is included because its header renders a signed-in state.
 */
const SESSION_PATHS: readonly string[] = [
  ...PROTECTED_PREFIXES,
  ...AUTH_ONLY_PREFIXES,
];

export const needsSession = (pathname: string): boolean =>
  pathname === "/" || SESSION_PATHS.some((prefix) => startsWithSegment(pathname, prefix));

export const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

export const isAuthOnlyPath = (pathname: string): boolean =>
  AUTH_ONLY_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));

/**
 * A path on this site, or nothing.
 *
 * The one function both directions of the return-to flow go through, and it
 * exists because the obvious version of this check is wrong. `startsWith("/")`
 * and `!startsWith("//")` looks like it covers the cases, and it does not:
 * `/\evil.com` passes both and resolves to `https://evil.com/`, because the
 * URL parser treats a backslash after the leading slash exactly like a second
 * slash. That is a phishing link that genuinely begins on showme.at, which is
 * the entire point of an open redirect.
 *
 * So the value is not pattern-matched, it is *resolved* against a throwaway
 * origin, and it is accepted only if the result is still on that origin. That
 * closes the backslash forms, protocol-relative forms, absolute URLs, and
 * anything else a parser would read as authority — and it returns the
 * normalized path rather than the caller's string, so what gets redirected to
 * is what was checked.
 */
const INTERNAL = "https://showme.invalid";

function samePath(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;

  try {
    const url = new URL(value, INTERNAL);
    if (url.origin !== INTERNAL) return null;

    /*
     * And one more, which resolving alone does not catch: `/..//evil.com`
     * normalizes to the pathname `//evil.com`, still on this origin as far as
     * the parser is concerned — and protocol-relative the moment it is handed
     * to `redirect()`. A path returned from here is used as a redirect target,
     * so it has to be safe as one.
     */
    if (url.pathname.startsWith("//")) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Build the sign-in URL that returns someone to where they were headed.
 *
 * Only same-site paths are carried through. Accepting an arbitrary `next`
 * value would turn the login page into an open redirect.
 */
export function signInUrl(returnTo?: string | null): string {
  const path = samePath(returnTo);
  return path ? `${SIGN_IN_PATH}?next=${encodeURIComponent(path)}` : SIGN_IN_PATH;
}

/** The inverse: read a `next` parameter without trusting it. */
export function safeReturnTo(value: string | null | undefined): string {
  return samePath(value) ?? AFTER_SIGN_IN;
}
