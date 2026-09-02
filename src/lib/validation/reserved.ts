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
 * Every entry must be in normalized form — lowercase and trimmed — and must
 * itself be a shape a username could take. An entry that could never be typed
 * as a username sits here looking protective while protecting nothing, so the
 * test suite asserts both properties rather than trusting them.
 */

/** Names that are, or will be, real routes in the application. */
const ROUTES = [
  "account",
  "accounts",
  "about",
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "blog",
  "careers",
  "changelog",
  "contact",
  "dashboard",
  "docs",
  "documentation",
  "developer",
  "developers",
  "download",
  "downloads",
  "editor",
  "enterprise",
  "explore",
  "faq",
  "feedback",
  "help",
  "home",
  "index",
  "invite",
  "jobs",
  "legal",
  "login",
  "logout",
  "new",
  "onboarding",
  "partners",
  "password",
  "plans",
  "press",
  "pricing",
  "privacy",
  "profile",
  "profiles",
  "register",
  "reset",
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
  "user",
  "users",
  "verify",
  "welcome",
] as const;

/** Names that would let an account pass itself off as ShowMe. */
const BRAND = [
  "showme",
  "show",
  "show-me",
  "showmeat",
  "showme-app",
  "official",
  "team",
  "staff",
  "moderator",
  "billing",
  "payments",
  "root",
  "system",
] as const;

/**
 * Paths and files the platform serves from the same origin.
 *
 * Only names a username could actually take. `_next` and `me` used to sit here
 * and protected nothing — the first cannot start with an underscore and the
 * second is below the minimum length, so neither was ever claimable. A static
 * route always beats `[username]` anyway.
 */
const INFRASTRUCTURE = [
  "assets",
  "cdn",
  "favicon",
  "images",
  "img",
  "public",
  "robots",
  "sitemap",
  "static",
  "well-known",
  "mail",
  "smtp",
  "ftp",
  "ns1",
  "ns2",
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
