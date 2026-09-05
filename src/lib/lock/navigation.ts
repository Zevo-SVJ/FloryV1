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
 * Foundation held a flat list of eight sections. The product has groups —
 * LEARN has a roadmap, lessons and missions — so the list is now nested, and
 * the flat `SECTIONS` view is *derived* from the nested one rather than
 * maintained beside it. Everything written against the flat list still works.
 *
 * `access` is the *minimum* a visitor must be to reach an item. It is not the
 * security boundary — that is `checkAccess()` in the data access layer, next to
 * the data. This decides whether a link is drawn and whether the proxy
 * redirects early.
 *
 * Every destination here is built and does what its summary says. The registry
 * once carried a `status` field so a half-built page could admit it; nothing is
 * half-built now, so the field is gone rather than left always reading the same
 * value. A dot that can never appear is worse than no dot: it implies a state
 * the product does not have.
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
  /** The sidebar heading. Uppercased by the stylesheet, not by this string. */
  label: string;
  /** The lowest role that sees the group at all. */
  access: SectionAccess;
  items: readonly Section[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    access: "learner",
    items: [
      {
        href: "/dashboard",
        label: "Home",
        summary: "Where you are, and what to do next.",
        access: "learner",
      },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    access: "learner",
    items: [
      {
        href: "/learn",
        label: "Roadmap",
        summary: "The ten phases, from an idea to a product people pay for.",
        access: "learner",
      },
      {
        href: "/learn/lessons",
        label: "Lessons",
        summary: "The teaching inside each phase.",
        access: "learner",
      },
      {
        href: "/learn/missions",
        label: "Missions",
        summary: "The work that turns a lesson into something you have built.",
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
        label: "Achievements",
        summary: "Milestones that mark real ground covered.",
        access: "learner",
      },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    access: "learner",
    items: [
      {
        href: "/resources/videos",
        label: "Videos",
        summary: "Walkthroughs worth watching once.",
        access: "learner",
      },
      {
        href: "/resources/docs",
        label: "Docs",
        summary: "Documentation for the tools you actually use.",
        access: "learner",
      },
      {
        href: "/resources/references",
        label: "References",
        summary: "Material worth coming back to.",
        access: "learner",
      },
    ],
  },
  {
    id: "mentor",
    label: "Your Mentor",
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
 * Every item, flattened.
 *
 * Derived rather than maintained: a second hand-written list is a second thing
 * to forget to update. Everything Foundation wrote against `SECTIONS` still
 * works unchanged.
 */
export const SECTIONS: readonly Section[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * The URL prefixes the shell owns.
 *
 * Taken from the first path segment of every item, so `/learn/lessons` and
 * `/learn/missions` both contribute `/learn` and a redirecting parent route is
 * covered without being listed. `lib/auth/routes.ts` protects these, which is
 * why deriving them beats writing them out: a new child page cannot end up
 * outside the session boundary by omission.
 */
export const PROTECTED_ROOTS: readonly string[] = [
  ...new Set(SECTIONS.map((section) => `/${section.href.split("/")[1] ?? ""}`)),
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
 * Longest match first, so `/learn/lessons` resolves to Lessons rather than to
 * the Roadmap at `/learn`. Sorting by length is what makes a nested route
 * highlight the right link.
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
