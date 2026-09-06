import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AREAS,
  PROTECTED_ROOTS,
  SECONDARY_ROUTES,
  SECTIONS,
  TAB_IDS,
  areaAt,
  areaOf,
  areasFor,
  requireSection,
  roleAllows,
  sectionAt,
  sectionsFor,
} from "@/lib/lock/navigation";
import { PROTECTED_PREFIXES } from "@/lib/auth/routes";
import type { AppRole } from "@/types/database";

/**
 * The registry is the single source of truth for the rail, the tab bar, the
 * in-area navigation, the session boundary and the role gates. These
 * assertions are what keep it from quietly becoming five sources of truth that
 * disagree.
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

describe("areasFor", () => {
  it("keeps the staff areas away from a learner entirely", () => {
    const ids = areasFor("learner").map((area) => area.id);
    assert.ok(!ids.includes("review"));
    assert.ok(!ids.includes("admin"));
  });

  it("gives a learner the six areas the product is made of", () => {
    assert.deepEqual(areasFor("learner").map((area) => area.id), [
      "home",
      "learn",
      "build",
      "toolbox",
      "progress",
      "mentor",
    ]);
  });

  it("gives a mentor the review queue but not admin", () => {
    const ids = areasFor("mentor").map((area) => area.id);
    assert.ok(ids.includes("review"));
    assert.ok(!ids.includes("admin"));
  });

  it("gives an admin every area", () => {
    assert.equal(areasFor("admin").length, AREAS.length);
  });

  it("agrees with the flat view", () => {
    for (const role of ["learner", "mentor", "admin"] as AppRole[]) {
      const fromAreas = areasFor(role)
        .flatMap((area) => [area.href, ...area.children.map((child) => child.href)])
        .sort();
      const flat = sectionsFor(role)
        .map((section) => section.href)
        .sort();
      assert.deepEqual(fromAreas, flat, `areas and flat disagree for ${role}`);
    }
  });
});

describe("the tab bar", () => {
  it("names four areas that exist", () => {
    assert.equal(TAB_IDS.length, 4);
    for (const id of TAB_IDS) {
      assert.ok(
        AREAS.some((area) => area.id === id),
        `${id} is a tab but not an area`,
      );
    }
  });

  it("puts only learner areas in the bar, so it never changes shape by role", () => {
    for (const id of TAB_IDS) {
      const area = AREAS.find((candidate) => candidate.id === id);
      assert.equal(area?.access, "learner", `${id} is a tab but is gated`);
    }
  });

  it("leaves every other area reachable through More", () => {
    /*
     * The rule the tab bar exists to keep: nothing is hidden on a phone, only
     * moved. Every area a role can see is either a tab or in the overflow.
     */
    for (const role of ["learner", "mentor", "admin"] as AppRole[]) {
      const areas = areasFor(role);
      const tabs = areas.filter((area) => TAB_IDS.includes(area.id));
      const overflow = areas.filter((area) => !TAB_IDS.includes(area.id));
      assert.equal(tabs.length + overflow.length, areas.length);
      assert.ok(overflow.length > 0, `${role} has nothing behind More`);
    }
  });
});

describe("the registry itself", () => {
  it("has no duplicate paths", () => {
    const hrefs = SECTIONS.map((section) => section.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("puts every destination behind the session boundary", () => {
    for (const section of SECTIONS) {
      const covered = PROTECTED_PREFIXES.some(
        (prefix) => section.href === prefix || section.href.startsWith(`${prefix}/`),
      );
      assert.ok(covered, `${section.href} is a destination but is not protected`);
    }
  });

  it("keeps detail routes behind the session boundary too", () => {
    for (const route of SECONDARY_ROUTES) {
      const covered = PROTECTED_PREFIXES.some(
        (prefix) => route === prefix || route.startsWith(`${prefix}/`),
      );
      assert.ok(covered, `${route} is reachable but not protected`);
    }
  });

  it("protects the grouping prefixes, not only the leaves", () => {
    for (const root of ["/learn", "/build", "/toolbox", "/progress", "/resources"]) {
      assert.ok(PROTECTED_ROOTS.includes(root), `${root} is not protected`);
    }
  });

  it("gives every destination a summary somebody could act on", () => {
    for (const section of SECTIONS) {
      assert.ok(section.summary.length > 10, `${section.href} has no useful summary`);
      assert.ok(section.label.length > 0, `${section.href} has no label`);
    }
  });

  it("gives every destination an area", () => {
    for (const section of SECTIONS) {
      assert.ok(areaOf(section.href), `${section.href} belongs to no area`);
    }
  });

  it("keeps the primary navigation small enough to read", () => {
    /*
     * Not arbitrary. The refoundation exists because eighteen sidebar links
     * made the learner choose before they could start; this fails loudly if the
     * navigation starts growing back.
     */
    assert.ok(
      areasFor("learner").length <= 6,
      `the learner navigation has grown to ${areasFor("learner").length} areas`,
    );
  });
});

describe("areaAt", () => {
  it("resolves an area's own route", () => {
    assert.equal(areaAt("/learn")?.id, "learn");
    assert.equal(areaAt("/build")?.id, "build");
  });

  it("resolves a child to its area, so a screen always lights up a tab", () => {
    const cases: [string, string][] = [
      ["/learn/start", "learn"],
      ["/learn/lessons/how-lock-teaches", "learn"],
      ["/learn/modules/demo-module", "learn"],
      ["/learn/missions/find-the-problem", "learn"],
      ["/build/artifacts", "build"],
      ["/build/log", "build"],
      ["/toolbox/prompts", "toolbox"],
      ["/toolbox/item/anything", "toolbox"],
      ["/resources", "toolbox"],
      ["/resources/videos", "toolbox"],
      ["/progress/skills", "progress"],
      ["/progress/achievements", "progress"],
    ];
    for (const [path, id] of cases) {
      assert.equal(areaAt(path)?.id, id, `${path} does not resolve to ${id}`);
    }
  });

  it("does not match a path that merely starts with the same letters", () => {
    assert.equal(areaAt("/learners"), undefined);
    assert.equal(areaAt("/nowhere"), undefined);
  });
});

describe("sectionAt", () => {
  it("prefers the longest match, so a child does not resolve to its parent", () => {
    assert.equal(sectionAt("/build")?.href, "/build");
    assert.equal(sectionAt("/build/artifacts")?.href, "/build/artifacts");
  });
});

describe("requireSection", () => {
  it("throws for a path it does not declare", () => {
    assert.throws(() => requireSection("/nowhere"), /No section is declared/);
  });

  it("carries the access level a gated screen reads", () => {
    assert.equal(requireSection("/admin").access, "admin");
    assert.equal(requireSection("/review").access, "staff");
    assert.equal(requireSection("/mentor").access, "learner");
  });
});
