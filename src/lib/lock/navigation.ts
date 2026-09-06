import type { IconName } from "@/components/ui/icon";
import type { AppRole } from "@/types/database";

/**
 * The map of LOCK, declared once.
 *
 * Single source of truth for five things that must never disagree: the
 * sidebar, the mobile tab bar, the in-area navigation, the session boundary,
 * and the role gates. `lib/auth/routes.ts` derives its rules from here, so
 * adding a page is one edit and cannot leave a route protected in the
 * navigation but open in the proxy.
 *
 * ── The model ───────────────────────────────────────────────────────────────
 *
 * Six AREAS, and everything else lives inside one of them.
 *
 *   Home      what to do now
 *   Learn     the programme
 *   My SaaS   the thing being built
 *   Toolbox   what to build it with
 *   Progress  how far along
 *   Mentor    who reads the work
 *
 * An area's `children` are real destinations that are deliberately *not* in the
 * primary navigation. Artifacts belongs to My SaaS; Skills belongs to Progress;
 * Prompts belongs to Toolbox. They appear inside their area, on the area's own
 * screen, where the learner already is — which is the difference between one
 * application and fifteen of them sharing a sidebar.
 *
 * This replaced a flat registry of eighteen sidebar links. The count was the
 * symptom; the cause was that the navigation named the schema rather than the
 * work.
 *
 * `access` is the *minimum* a visitor must be. It is not the security boundary
 * — that is `checkAccess()` in the data access layer, next to the data. This
 * decides whether a link is drawn and whether the proxy redirects early.
 */

export type SectionAccess = "learner" | "staff" | "admin";

export interface Section {
  href: string;
  label: string;
  /** One line. The page's description and the link's title. */
  summary: string;
  access: SectionAccess;
}

export interface Area extends Section {
  id: string;
  icon: IconName;
  /** Destinations inside this area. Never drawn in the primary navigation. */
  children: readonly Section[];
}

export const AREAS: readonly Area[] = [
  {
    id: "home",
    href: "/dashboard",
    label: "Home",
    icon: "home",
    summary: "What to do now, and what you have done so far.",
    access: "learner",
    children: [],
  },
  {
    id: "learn",
    href: "/learn",
    label: "Learn",
    icon: "learn",
    summary: "The programme: ten phases, their modules, lessons and missions.",
    access: "learner",
    children: [
      {
        href: "/learn/start",
        label: "How LOCK works",
        summary: "How the programme runs, and what you will produce.",
        access: "learner",
      },
      {
        href: "/learn/lessons",
        label: "All lessons",
        summary: "The complete lesson index, for finding one specific thing.",
        access: "learner",
      },
      {
        href: "/learn/missions",
        label: "All missions",
        summary: "The complete mission index, for finding one specific thing.",
        access: "learner",
      },
    ],
  },
  {
    id: "build",
    href: "/build",
    label: "My SaaS",
    icon: "build",
    summary: "The product you are building, and everything it is made of.",
    access: "learner",
    children: [
      {
        href: "/build/artifacts",
        label: "Artifacts",
        summary: "What each mission produced — the evidence your product exists.",
        access: "learner",
      },
      {
        href: "/build/log",
        label: "Build log",
        summary: "What you decided, when, and why.",
        access: "learner",
      },
    ],
  },
  {
    id: "toolbox",
    href: "/toolbox",
    label: "Toolbox",
    icon: "toolbox",
    summary: "Prompts, templates, frameworks, checklists, resources and the stack.",
    access: "learner",
    children: [
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
    href: "/progress",
    label: "Progress",
    icon: "progress",
    summary: "Where you are, at every level that means something.",
    access: "learner",
    children: [
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
    href: "/mentor",
    label: "Mentor",
    icon: "mentor",
    summary: "Send work for review, and read what came back.",
    access: "learner",
    children: [],
  },
  /*
   * Staff areas. Separate because Foundation put the review queue at `/mentor`,
   * which the product now needs for the learner's own mentor page. The queue
   * moved to `/review` rather than losing its role gate.
   */
  {
    id: "review",
    href: "/review",
    label: "Review",
    icon: "list",
    summary: "Submissions waiting on review, and the feedback you have given.",
    access: "staff",
    children: [],
  },
  {
    id: "admin",
    href: "/admin",
    label: "Admin",
    icon: "sidebar",
    summary: "Accounts, roles and the content behind the program.",
    access: "admin",
    children: [],
  },
] as const;

/**
 * The tabs on a phone, in order.
 *
 * Four plus More, chosen by how often a learner actually needs each: Learn and
 * My SaaS are where the work happens, Home is the way back to "what now", and
 * Toolbox is reached mid-task. Progress and Mentor are checked occasionally,
 * so they sit behind More rather than crowding a bar that has to stay
 * thumb-sized. Everything remains reachable — only the path to it changes.
 */
export const TAB_IDS: readonly string[] = ["home", "learn", "build", "toolbox"];

/** Every destination, flattened. Derived, never maintained by hand. */
export const SECTIONS: readonly Section[] = AREAS.flatMap((area) => [
  { href: area.href, label: area.label, summary: area.summary, access: area.access },
  ...area.children,
]);

/**
 * Routes that exist and work but are nobody's declared destination — detail
 * pages, reached from inside their area. Listed so the session boundary keeps
 * covering them even if a parent prefix ever stops being a navigation item.
 */
export const SECONDARY_ROUTES: readonly string[] = [
  "/learn/modules",
  "/learn/lessons",
  "/learn/missions",
  "/toolbox/item",
  "/resources/videos",
  "/resources/docs",
  "/resources/references",
] as const;

/** The URL prefixes the shell owns. */
export const PROTECTED_ROOTS: readonly string[] = [
  ...new Set(
    [...SECTIONS.map((s) => s.href), ...SECONDARY_ROUTES].map(
      (href) => `/${href.split("/")[1] ?? ""}`,
    ),
  ),
];

/** Does this role clear the bar an area or a section sets? */
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

/** The areas a given role may see, with their children filtered too. */
export function areasFor(role: AppRole): Area[] {
  return AREAS.filter((area) => roleAllows(role, area.access)).map((area) => ({
    ...area,
    children: area.children.filter((child) => roleAllows(role, child.access)),
  }));
}

/** The flat destinations a given role may see. */
export const sectionsFor = (role: AppRole): Section[] =>
  SECTIONS.filter((section) => roleAllows(role, section.access));

/**
 * The area a path belongs to.
 *
 * Checked against an area's own href *and* each of its children, so
 * `/resources/videos` lights up Toolbox rather than nothing — a screen that
 * highlights no tab reads as being outside the application. Longest match
 * first, so `/build/artifacts` resolves before `/build`.
 */
export function areaAt(pathname: string): Area | undefined {
  const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return [...AREAS]
    .map((area) => {
      const hrefs = [area.href, ...area.children.map((c) => c.href)];
      const match = hrefs.filter(under).sort((a, b) => b.length - a.length)[0];
      return match ? { area, length: match.length } : null;
    })
    .filter((hit): hit is { area: Area; length: number } => hit !== null)
    .sort((a, b) => b.length - a.length)[0]?.area;
}

/** The exact destination a path is, if it is one. Longest match first. */
export const sectionAt = (pathname: string): Section | undefined =>
  [...SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));

/**
 * The destination declared at a path, insisted upon.
 *
 * A page asking for an href that is not declared is a mistake in this file, not
 * a missing page, so it throws rather than 404s.
 */
export function requireSection(href: string): Section {
  const section = SECTIONS.find((candidate) => candidate.href === href);
  if (!section) throw new Error(`No section is declared for ${href}`);
  return section;
}

/** The area an href belongs to, by declaration rather than by path. */
export const areaOf = (href: string): Area | undefined =>
  AREAS.find((area) => area.href === href || area.children.some((c) => c.href === href));
