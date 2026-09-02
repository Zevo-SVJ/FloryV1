/**
 * Usernames ShowMe keeps for itself.
 *
 * Two reasons a name lands here. Some are real routes — `showme.at/login` must
 * stay the login page, so nobody may claim `login`. Others are names we will
 * want later, or that would let someone impersonate the product.
 *
 * This list is mirrored into the `reserved_usernames` table by the initial
 * migration, and the database enforces it with a trigger. Keeping both copies
 * matters: the TypeScript list gives instant feedback while someone types, and
 * the database is what actually holds the line. To add a name, add it here and
 * write a migration that inserts it.
 *
 * Every entry must already be in normalized form. A name written with a hyphen
 * would never match anything: normalization strips the hyphen first, so
 * `well-known` would sit in this list looking protective while `wellknown`
 * stayed free. The test suite asserts the invariant rather than trusting it.
 */

/** Names that are, or will be, real routes in the application. */
const ROUTES = [
  "about",
  "admin",
  "api",
  "auth",
  "blog",
  "careers",
  "changelog",
  "contact",
  "dashboard",
  "docs",
  "editor",
  "explore",
  "help",
  "home",
  "legal",
  "login",
  "logout",
  "onboarding",
  "pricing",
  "privacy",
  "search",
  "security",
  "settings",
  "signin",
  "signout",
  "signup",
  "status",
  "support",
  "terms",
  "upgrade",
  "welcome",
] as const;

/** Names that would let an account pass itself off as ShowMe. */
const BRAND = [
  "showme",
  "showmeat",
  "official",
  "team",
  "staff",
  "moderator",
  "billing",
  "payments",
  "root",
  "system",
] as const;

/** Paths and files the platform serves from the same origin. */
const INFRASTRUCTURE = [
  "_next",
  "assets",
  "cdn",
  "favicon",
  "images",
  "img",
  "public",
  "robots",
  "sitemap",
  "static",
  "wellknown",
] as const;

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set<string>([
  ...ROUTES,
  ...BRAND,
  ...INFRASTRUCTURE,
]);

/** Expects an already-normalized username. */
export const isReservedUsername = (username: string): boolean =>
  RESERVED_USERNAMES.has(username);

/** Sorted, for generating migrations and for tests. */
export const reservedUsernameList = (): string[] =>
  [...RESERVED_USERNAMES].sort();
