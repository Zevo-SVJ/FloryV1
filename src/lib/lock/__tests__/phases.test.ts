import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PHASES, phaseByKey } from "@/lib/lock/phases";

/**
 * The program's spine. These are the identifiers a future `phases` table will
 * be seeded from, so a silent renumbering or a duplicate key would be a
 * migration bug months from now.
 */
describe("the phases", () => {
  it("is the ten-phase journey, in order", () => {
    assert.equal(PHASES.length, 10);
    assert.deepEqual(
      PHASES.map((phase) => phase.number),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    assert.equal(PHASES[0]?.key, "think");
    assert.equal(PHASES[9]?.key, "grow");
  });

  it("has unique keys and labels", () => {
    assert.equal(new Set(PHASES.map((phase) => phase.key)).size, 10);
    assert.equal(new Set(PHASES.map((phase) => phase.label)).size, 10);
  });

  it("looks up by key", () => {
    assert.equal(phaseByKey("build")?.number, 6);
  });
});
