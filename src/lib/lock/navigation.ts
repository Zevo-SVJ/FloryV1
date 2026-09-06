import type { AppRole } from "@/types/database";

/**
 * The map of LOCK, declared once.
 *
 * This file is the single source of truth for four things that must never
 * disagree: what the sidebar draws, what the mobile drawer draws, which paths
 * need a session, and which paths need a role. `lib/auth/routes.ts` derives its
 * rules from here rather than repeating them, so adding a page is one edit and
 * cannot leave a route protected in the navigation but open in the proxy.
 *
 * `access` is the *minimum* a visitor must be to reach an item. It is not the
 * security boundary — that is `checkAccess()` in the data access layer, next to
 * the data. This decides whether a link is drawn and whether the proxy
 * redirects early.
 *
 * ── What changed, and why ────────────────────────────────────────────────────
 *
 * The sidebar used to carry eighteen destinations, three of which — Roadmap,
 * Lessons, Missions — were three views onto the same curriculum. A learner had
 * to know which of the three answered "what do I do next" before they could
 * find out, and the answer was different on each. Six more were Videos, Docs
 * and References, which are one library filtered three ways.
 *
 * The navigation now names what a learner does, not what the database stores:
 *
 *   Home      what to do now
 *   Learn     the whole programme, one destination
 *   My SaaS   the thing being built
 *   Toolbox   what to build it with
 *   Progress  how far along
 *   Mentor    who reads the work
 *
 * The routes that were demoted still exist and still work; they are listed in
 * `SECONDARY_ROUTES` so the session boundary keeps covering them, and they are
 * reachable from inside Learn. They are no longer places a learner has to
 * choose between before they can start.
 */

export type SectionAccess = "learner" | "staff" | "admin";

export interface Section {
  href: string;
  label: string;
  /** One line. Shown as the page's description and as the link's title. */
  summary: string;
  access: SectionAccess;
}

export interface NavGroup {
  id: string;
  /**
   * The sidebar heading, uppercased by the stylesheet rather than by this
   * string. Omitted for the first group: Home and Learn do not need a category
   * above them, and a heading there would be a word the reader has to skip.
   */
  label?: string;
  /** The lowest role that sees the group at all. */
  access: SectionAccess;
  items: readonly Section[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "primary",
    access: "learner",
    items: [
      {
        href: "/dashboard",
        label: "Home",
        summary: "What to do now, and what you have done so far.",
        access: "learner",
      },
      {
        href: "/learn",
        label: "Learn",
        summary: "The programme: ten phases, their modules, lessons and missions.",
        access: "learner",
      },
    ],
  },
  {
    id: "saas",
    label: "My SaaS",
    access: "learner",
    items: [
      {
        href: "/build",
        label: "Overview",
        summary: "The product you are building, in one place.",
        access: "learner",
      },
      {
        href: "/build/artifacts",
        label: "Artifacts",
        summary: "What each mission produced — the evidence your product exists.",
        access: "learner",
      },
      {
        href: "/build/log",
        label: "Build Log",
        summary: "What you decided, when, and why.",
        access: "learner",
      },
    ],
  },
  {
    id: "toolbox",
    label: "Toolbox",
    access: "learner",
    items: [
      {
        href: "/toolbox/prompts",
        label: "Prompts",
        summary: "Prompts worth reusing, for the jobs that recur.",
        access: "learner",
      },
      {
        href: "/toolbox/templates",
        label: "Templates",
        summary: "Documents you fill in rather than invent.",
        access: "learner",
      },
      {
        href: "/toolbox/frameworks",
        label: "Frameworks",
        summary: "Ways of thinking that hold up under pressure.",
        access: "learner",
      },
      {
        href: "/toolbox/checklists",
        label: "Checklists",
        summary: "What to verify before you call something done.",
        access: "learner",
      },
      {
        href: "/toolbox/stack",
        label: "Stack",
        summary: "The tools you build with, and when each one earns its place.",
        access: "learner",
      },
      {
        href: "/resources",
        label: "Resources",
        summary: "Videos, documentation and references worth coming back to.",
        access: "learner",
      },
    ],
  },
  {
    id: "progress",
    label: "Progress",
    access: "learner",
    items: [
      {
        href: "/progress",
        label: "Overview",
        summary: "Where you are, at every level that means something.",
        access: "learner",
      },
      {
        href: "/progress/skills",
        label: "Skills",
        summary: "What you can do now that you could not do before.",
        access: "learner",
      },
      {
        href: "/progress/achievements",
        label: "Milestones",
        summary: "Milestones that mark real ground covered.",
        access: "learner",
      },
    ],
  },
  {
    id: "mentor",
    label: "Mentor",
    access: "learner",
    items: [
      {
        href: "/mentor",
        label: "Zevo",
        summary: "Send work for review, and read what came back.",
        access: "learner",
      },
    ],
  },
  {
    /*
     * Staff only, and it is the reason this group exists separately: Foundation
     * put the review queue at `/mentor`, which the product now needs for the
     * learner's own mentor page. The queue moved to `/review` rather than
     * losing its role gate — a mentor still has somewhere only a mentor can go,
     * and `/admin` is still admin-only.
     */
    id: "staff",
    label: "Staff",
    access: "staff",
    items: [
      {
        href: "/review",
        label: "Review",
        summary: "Submissions waiting on review, and the feedback you have given.",
        access: "staff",
      },
      {
        href: "/admin",
        label: "Admin",
        summary: "Accounts, roles and the content behind the program.",
        access: "admin",
      },
    ],
  },
] as const;

/**
 * Routes that exist and work, but are not places to send somebody.
 *
 * Every one of these is reachable from inside the experience it belongs to —
 * the lesson and mission indexes from Learn, the narrowed resource views from
 * Resources. They are listed so the session boundary derived below keeps
 * covering them if their parent prefix ever stops being a navigation item, and
 * so that "which routes did we demote rather than delete" has an answer in the
 * code rather than only in a commit message.
 */
export const SECONDARY_ROUTES: readonly string[] = [
  "/learn/lessons",
  "/learn/missions",
  "/learn/modules",
  "/learn/start",
  "/resources/videos",
  "/resources/docs",
  "/resources/references",
] as const;

/**
 * Every item, flattened.
 *
 * Derived rather than maintained: a second hand-written list is a second thing
 * to forget to update.
 */
export const SECTIONS: readonly Section[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * The URL prefixes the shell owns.
 *
 * Taken from the first path segment of every navigation item *and* every
 * secondary route, so a demoted page cannot fall outside the session boundary
 * by no longer being in the sidebar.
 */
export const PROTECTED_ROOTS: readonly string[] = [
  ...new Set(
    [...SECTIONS.map((section) => section.href), ...SECONDARY_ROUTES].map(
      (href) => `/${href.split("/")[1] ?? ""}`,
    ),
  ),
];

/** Does this role clear the bar an item or a group sets? */
export function roleAllows(role: AppRole, access: SectionAccess): boolean {
  switch (access) {
    case "learner":
      return true;
    case "staff":
      return role === "mentor" || role === "admin";
    case "admin":
      return role === "admin";
  }
}

/** The items a given role may see. */
export const sectionsFor = (role: AppRole): Section[] =>
  SECTIONS.filter((section) => roleAllows(role, section.access));

/**
 * The navigation a given role may see, still grouped.
 *
 * Filtered at both levels, and a group whose items are all out of reach is
 * dropped rather than drawn empty — an admin sees `Admin` under `Staff`, a
 * mentor sees `Review` there, and a learner sees no `Staff` heading at all.
 */
export function navGroupsFor(role: AppRole): NavGroup[] {
  return NAV_GROUPS.filter((group) => roleAllows(role, group.access))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => roleAllows(role, item.access)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * The item a path belongs to.
 *
 * Longest match first, so `/build/artifacts` resolves to Artifacts rather than
 * to the overview at `/build`. Everything under `/learn` now resolves to Learn,
 * which is the point of the consolidation: the lesson you are reading is inside
 * the programme, not in a separate library.
 */
export const sectionAt = (pathname: string): Section | undefined =>
  [...SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
    );

/**
 * The item declared at a path, insisted upon.
 *
 * A page asking for an href that is not in the list is a mistake in this file,
 * not a missing page, so it throws rather than 404s — a loud failure in
 * development beats a route that quietly renders nothing.
 */
export function requireSection(href: string): Section {
  const section = SECTIONS.find((candidate) => candidate.href === href);
  if (!section) throw new Error(`No section is declared for ${href}`);
  return section;
}

/** The group an item belongs to. Used for the eyebrow on a page header. */
export const groupOf = (href: string): NavGroup | undefined =>
  NAV_GROUPS.find((group) => group.items.some((item) => item.href === href));
