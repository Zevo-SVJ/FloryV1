import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NAV_GROUPS,
  PROTECTED_ROOTS,
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
    assert.ok(hrefs.includes("/learn/lessons"));
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

  it("says which prompt builds each section that is not built", () => {
    for (const section of SECTIONS) {
      if (section.status === "planned") {
        assert.ok(section.arrivesIn, `${section.href} is planned but says nothing about when`);
      }
    }
  });

  it("gives every item a group", () => {
    for (const section of SECTIONS) {
      assert.ok(groupOf(section.href), `${section.href} belongs to no group`);
    }
  });
});

describe("sectionAt", () => {
  it("prefers the longest match, so a child does not resolve to its parent", () => {
    assert.equal(sectionAt("/learn")?.href, "/learn");
    assert.equal(sectionAt("/learn/lessons")?.href, "/learn/lessons");
    assert.equal(sectionAt("/learn/lessons/think-01")?.href, "/learn/lessons");
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
