import type { AppRole } from "@/types/database";

/**
 * The sections of LOCK, declared once.
 *
 * This list is the single source of truth for three things that must never
 * disagree: what the sidebar renders, which paths need a session, and which
 * paths need a role. `lib/auth/routes.ts` derives its rules from here rather
 * than repeating them, so adding a section is one edit and cannot leave a route
 * protected in the navigation but open in the proxy.
 *
 * `access` is the *minimum* a visitor must be to reach the section. It is not
 * the security boundary — that is `requireStaff()` / `requireAdmin()` in the
 * data access layer, next to the data. This is what decides whether a link is
 * drawn and whether the proxy redirects early.
 *
 * `status` is honesty in the interface. Foundation ships the shell, the session
 * and the boundaries; the sections themselves arrive in later prompts, and a
 * page that says so is better than one that pretends.
 */

export type SectionAccess = "learner" | "staff" | "admin";

/** `built` means the section does what it says. `planned` means it does not yet. */
export type SectionStatus = "built" | "planned";

export interface Section {
  href: string;
  label: string;
  /** One line, shown in the placeholder and as the link's title attribute. */
  summary: string;
  access: SectionAccess;
  status: SectionStatus;
  /** Which prompt in the build sequence fills this in. Removed as each lands. */
  arrivesIn?: string;
}

export const SECTIONS: readonly Section[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    summary: "Where you are in the program, and what to do next.",
    access: "learner",
    status: "built",
  },
  {
    href: "/learn",
    label: "Learn",
    summary: "The ten phases, their modules and their lessons.",
    access: "learner",
    status: "planned",
    arrivesIn: "Prompt 3 — Learning engine",
  },
  {
    href: "/build",
    label: "My SaaS",
    summary: "The product you are building, and the artifacts that prove it.",
    access: "learner",
    status: "planned",
    arrivesIn: "Prompt 4 — Missions and artifacts",
  },
  {
    href: "/toolbox",
    label: "Toolbox",
    summary: "Prompts, frameworks, templates and checklists you reuse.",
    access: "learner",
    status: "planned",
    arrivesIn: "Prompt 5 — Toolbox",
  },
  {
    href: "/progress",
    label: "Progress",
    summary: "Completed missions, milestones and the record of the build.",
    access: "learner",
    status: "planned",
    arrivesIn: "Prompt 7 — Progress",
  },
  {
    href: "/resources",
    label: "Resources",
    summary: "Reference material worth coming back to.",
    access: "learner",
    status: "planned",
    arrivesIn: "Prompt 8 — Content system",
  },
  {
    href: "/mentor",
    label: "Mentor",
    summary: "Submissions waiting on review, and the feedback you have given.",
    access: "staff",
    status: "planned",
    arrivesIn: "Prompt 6 — Mentor and admin",
  },
  {
    href: "/admin",
    label: "Admin",
    summary: "Accounts, roles and the content behind the program.",
    access: "admin",
    status: "planned",
    arrivesIn: "Prompt 6 — Mentor and admin",
  },
] as const;

/** Does this role clear the bar a section sets? */
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

/** The sections a given role may see. Used to draw the navigation. */
export const sectionsFor = (role: AppRole): Section[] =>
  SECTIONS.filter((section) => roleAllows(role, section.access));

/** The section a path belongs to, or undefined for a path outside the shell. */
export const sectionAt = (pathname: string): Section | undefined =>
  SECTIONS.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );

/**
 * The section declared at a path, insisted upon.
 *
 * A page asking for a section that is not in the list is a mistake in this
 * file, not a missing page, so it throws rather than 404s — a loud failure in
 * development beats a route that quietly renders nothing.
 */
export function requireSection(href: string): Section {
  const section = SECTIONS.find((candidate) => candidate.href === href);
  if (!section) throw new Error(`No section is declared for ${href}`);
  return section;
}
