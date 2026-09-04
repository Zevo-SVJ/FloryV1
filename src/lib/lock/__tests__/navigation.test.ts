import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SECTIONS,
  requireSection,
  roleAllows,
  sectionAt,
  sectionsFor,
} from "@/lib/lock/navigation";
import { PROTECTED_PREFIXES } from "@/lib/auth/routes";
import type { AppRole } from "@/types/database";

/**
 * The section registry is the single source of truth for the navigation and for
 * the route policy. These assertions are what keep it from becoming two sources
 * of truth that disagree.
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

describe("sectionsFor", () => {
  it("hides the mentor and admin sections from a learner", () => {
    const hrefs = sectionsFor("learner").map((section) => section.href);
    assert.ok(!hrefs.includes("/mentor"));
    assert.ok(!hrefs.includes("/admin"));
    assert.ok(hrefs.includes("/dashboard"));
  });

  it("gives a mentor the mentor section but not admin", () => {
    const hrefs = sectionsFor("mentor").map((section) => section.href);
    assert.ok(hrefs.includes("/mentor"));
    assert.ok(!hrefs.includes("/admin"));
  });

  it("gives an admin everything", () => {
    assert.equal(sectionsFor("admin").length, SECTIONS.length);
  });
});

describe("the registry itself", () => {
  it("declares every section behind the session boundary", () => {
    for (const section of SECTIONS) {
      assert.ok(
        PROTECTED_PREFIXES.includes(section.href),
        `${section.href} is in the navigation but not protected`,
      );
    }
  });

  it("has no duplicate paths", () => {
    const hrefs = SECTIONS.map((section) => section.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("says which prompt builds each section that is not built", () => {
    for (const section of SECTIONS) {
      if (section.status === "planned") {
        assert.ok(section.arrivesIn, `${section.href} is planned but says nothing about when`);
      }
    }
  });

  it("resolves a path to its section, including descendants", () => {
    assert.equal(sectionAt("/learn")?.href, "/learn");
    assert.equal(sectionAt("/learn/think")?.href, "/learn");
    assert.equal(sectionAt("/learners"), undefined);
    assert.equal(sectionAt("/nowhere"), undefined);
  });

  it("throws for a path it does not declare", () => {
    assert.throws(() => requireSection("/nowhere"), /No section is declared/);
    assert.equal(requireSection("/admin").access, "admin");
  });
});
