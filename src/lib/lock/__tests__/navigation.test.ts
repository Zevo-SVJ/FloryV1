import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NAV_GROUPS,
  PROTECTED_ROOTS,
  SECONDARY_ROUTES,
  SECTIONS,
  groupOf,
  navGroupsFor,
  requireSection,
  roleAllows,
  sectionAt,
  sectionsFor,
} from "@/lib/lock/navigation";
import { PROTECTED_PREFIXES } from "@/lib/auth/routes";
import type { AppRole } from "@/types/database";

/**
 * The registry is the single source of truth for the sidebar, the mobile
 * drawer, the session boundary and the role gates. These assertions are what
 * keep it from quietly becoming four sources of truth that disagree.
 */

describe("roleAllows", () => {
  const cases: [AppRole, string, boolean][] = [
    ["learner", "learner", true],
    ["learner", "staff", false],
    ["learner", "admin", false],
    ["mentor", "learner", true],
    ["mentor", "staff", true],
    ["mentor", "admin", false],
    ["admin", "learner", true],
    ["admin", "staff", true],
    ["admin", "admin", true],
  ];

  for (const [role, access, expected] of cases) {
    it(`${role} ${expected ? "clears" : "does not clear"} ${access}`, () => {
      assert.equal(roleAllows(role, access as "learner" | "staff" | "admin"), expected);
    });
  }
});

describe("navGroupsFor", () => {
  it("keeps the staff group away from a learner entirely", () => {
    const groups = navGroupsFor("learner");
    assert.ok(!groups.some((group) => group.id === "staff"));

    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
    assert.ok(!hrefs.includes("/review"));
    assert.ok(!hrefs.includes("/admin"));
  });

  it("gives a learner their own mentor page", () => {
    // `/mentor` is the learner's page — "Your Mentor, Zevo". The review queue
    // it used to be lives at `/review` and is still staff-only.
    const hrefs = navGroupsFor("learner").flatMap((g) => g.items.map((i) => i.href));
    assert.ok(hrefs.includes("/mentor"));
    assert.ok(hrefs.includes("/dashboard"));
    assert.ok(hrefs.includes("/learn"));
  });

  it("gives a mentor the review queue but not admin", () => {
    const staff = navGroupsFor("mentor").find((group) => group.id === "staff");
    assert.ok(staff);
    const hrefs = staff.items.map((item) => item.href);
    assert.deepEqual(hrefs, ["/review"]);
  });

  it("gives an admin every item", () => {
    const count = navGroupsFor("admin").reduce((n, group) => n + group.items.length, 0);
    assert.equal(count, SECTIONS.length);
  });

  it("never renders a group with nothing in it", () => {
    for (const role of ["learner", "mentor", "admin"] as AppRole[]) {
      for (const group of navGroupsFor(role)) {
        assert.ok(group.items.length > 0, `${role} sees an empty ${group.id}`);
      }
    }
  });

  it("agrees with the flat view", () => {
    for (const role of ["learner", "mentor", "admin"] as AppRole[]) {
      const grouped = navGroupsFor(role)
        .flatMap((group) => group.items.map((item) => item.href))
        .sort();
      const flat = sectionsFor(role)
        .map((section) => section.href)
        .sort();
      assert.deepEqual(grouped, flat, `grouped and flat disagree for ${role}`);
    }
  });
});

describe("the registry itself", () => {
  it("derives the flat list from the groups", () => {
    const fromGroups = NAV_GROUPS.flatMap((group) => group.items.length);
    assert.equal(
      fromGroups.reduce((a, b) => a + b, 0),
      SECTIONS.length,
    );
  });

  it("has no duplicate paths", () => {
    const hrefs = SECTIONS.map((section) => section.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("puts every item behind the session boundary", () => {
    for (const section of SECTIONS) {
      const covered = PROTECTED_PREFIXES.some(
        (prefix) => section.href === prefix || section.href.startsWith(`${prefix}/`),
      );
      assert.ok(covered, `${section.href} is in the navigation but not protected`);
    }
  });

  it("protects the grouping prefixes too, not only the leaves", () => {
    // `/toolbox` redirects to its first child. It must still require a session.
    for (const root of ["/learn", "/build", "/toolbox", "/progress", "/resources"]) {
      assert.ok(PROTECTED_ROOTS.includes(root), `${root} is not protected`);
    }
  });

  it("gives every destination a summary somebody could act on", () => {
    /*
     * This replaced an assertion about a `status` field that marked unfinished
     * pages. Nothing is unfinished, so the field is gone; what is still worth
     * enforcing is that no link ships without saying where it goes, since the
     * summary is the page's description as well as the link's title.
     */
    for (const section of SECTIONS) {
      assert.ok(section.summary.length > 10, `${section.href} has no useful summary`);
      assert.ok(section.label.length > 0, `${section.href} has no label`);
    }
  });

  it("gives every item a group", () => {
    for (const section of SECTIONS) {
      assert.ok(groupOf(section.href), `${section.href} belongs to no group`);
    }
  });

  it("keeps demoted routes behind the session boundary", () => {
    /*
     * The point of `SECONDARY_ROUTES`: taking a page out of the sidebar must
     * not take it out of the protected set. A lesson index nobody links to is
     * still a lesson index, and it still reads a learner's progress.
     */
    for (const route of SECONDARY_ROUTES) {
      const covered = PROTECTED_PREFIXES.some(
        (prefix) => route === prefix || route.startsWith(`${prefix}/`),
      );
      assert.ok(covered, `${route} is demoted but not protected`);
    }
  });

  it("does not list a demoted route in the sidebar", () => {
    const hrefs = SECTIONS.map((section) => section.href);
    for (const route of SECONDARY_ROUTES) {
      assert.ok(!hrefs.includes(route), `${route} is both demoted and in the navigation`);
    }
  });

  it("keeps the learner sidebar small enough to read", () => {
    /*
     * Not arbitrary: the refoundation exists because eighteen destinations made
     * the learner choose before they could start. This fails loudly if the
     * sidebar starts growing back.
     */
    assert.ok(
      sectionsFor("learner").length <= 15,
      `the learner sidebar has grown to ${sectionsFor("learner").length} items`,
    );
  });
});

describe("sectionAt", () => {
  it("prefers the longest match, so a child does not resolve to its parent", () => {
    assert.equal(sectionAt("/build")?.href, "/build");
    assert.equal(sectionAt("/build/artifacts")?.href, "/build/artifacts");
    assert.equal(sectionAt("/build/artifacts/x")?.href, "/build/artifacts");
  });

  it("resolves everything under the programme to Learn", () => {
    /*
     * The consolidation, asserted. Lessons and missions are no longer separate
     * destinations, so reading one must light up Learn rather than nothing —
     * a page that highlights no sidebar item reads as being outside the app.
     */
    for (const path of [
      "/learn",
      "/learn/start",
      "/learn/lessons",
      "/learn/lessons/how-lock-teaches",
      "/learn/missions",
      "/learn/modules/demo-module",
    ]) {
      assert.equal(sectionAt(path)?.href, "/learn", `${path} does not resolve to Learn`);
    }
  });

  it("does not match a path that merely starts with the same letters", () => {
    assert.equal(sectionAt("/learners"), undefined);
    assert.equal(sectionAt("/nowhere"), undefined);
  });
});

describe("requireSection", () => {
  it("throws for a path it does not declare", () => {
    assert.throws(() => requireSection("/nowhere"), /No section is declared/);
  });

  it("carries the access level a gated page reads", () => {
    assert.equal(requireSection("/admin").access, "admin");
    assert.equal(requireSection("/review").access, "staff");
    assert.equal(requireSection("/mentor").access, "learner");
  });
});
