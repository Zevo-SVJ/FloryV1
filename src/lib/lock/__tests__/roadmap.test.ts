import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRoadmap, PHASE_STATE_LABEL, type PhaseState } from "@/lib/lock/roadmap";
import { PHASES } from "@/lib/lock/phases";

const stateOf = (phases: ReturnType<typeof buildRoadmap>, key: string): PhaseState =>
  phases.find((phase) => phase.key === key)!.state;

describe("buildRoadmap with no data", () => {
  it("invents nothing", () => {
    const roadmap = buildRoadmap(null);
    assert.equal(roadmap.length, 10);
    // Not "think is current". Nobody has started anything.
    assert.ok(roadmap.every((phase) => phase.state === "upcoming"));
  });

  it("keeps the phases in order, with their numbers", () => {
    const roadmap = buildRoadmap(null);
    assert.deepEqual(
      roadmap.map((phase) => phase.number),
      PHASES.map((phase) => phase.number),
    );
  });
});

describe("buildRoadmap with progress", () => {
  it("marks behind, under foot, next and out of reach", () => {
    const roadmap = buildRoadmap({ completed: ["think", "research"], current: "validate" });

    assert.equal(stateOf(roadmap, "think"), "complete");
    assert.equal(stateOf(roadmap, "research"), "complete");
    assert.equal(stateOf(roadmap, "validate"), "current");
    assert.equal(stateOf(roadmap, "product"), "upcoming");
    assert.equal(stateOf(roadmap, "design"), "locked");
    assert.equal(stateOf(roadmap, "grow"), "locked");
  });

  it("opens the first unfinished phase when nothing is in progress", () => {
    const roadmap = buildRoadmap({ completed: ["think"], current: null });

    assert.equal(stateOf(roadmap, "think"), "complete");
    assert.equal(stateOf(roadmap, "research"), "upcoming");
    assert.equal(stateOf(roadmap, "validate"), "locked");
  });

  it("leaves nothing open once every phase is done", () => {
    const roadmap = buildRoadmap({
      completed: PHASES.map((phase) => phase.key),
      current: null,
    });
    assert.ok(roadmap.every((phase) => phase.state === "complete"));
  });

  it("ignores a current phase it does not recognise", () => {
    // Defensive: `current` will come from the database, and a stale key there
    // must not put the roadmap into a state with no phases open.
    const roadmap = buildRoadmap({ completed: [], current: null });
    assert.equal(stateOf(roadmap, "think"), "upcoming");
  });
});

describe("PHASE_STATE_LABEL", () => {
  it("names every state exactly once", () => {
    const labels = Object.values(PHASE_STATE_LABEL);
    assert.equal(labels.length, 4);
    assert.equal(new Set(labels).size, 4);
  });
});
