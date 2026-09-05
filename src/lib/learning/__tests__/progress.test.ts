import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveRoadmapProgress, remainingMinutes } from "@/lib/learning/progress";
import type { PhaseWithModules } from "@/lib/learning/queries";

const lesson = (id: string, minutes = 10) => ({
  id,
  slug: id,
  title: id,
  summary: "",
  type: "lesson" as const,
  difficulty: "foundational" as const,
  estimatedMinutes: minutes,
  completionRule: "read" as const,
  position: 1,
  isDemo: false,
});

const phase = (key: string, position: number, lessons: ReturnType<typeof lesson>[]) =>
  ({
    phase: {
      key,
      position,
      label: key,
      summary: "",
      published: true,
      created_at: "",
      updated_at: "",
    },
    modules: lessons.length
      ? [
          {
            module: {
              id: `${key}-m`,
              phase_key: key,
              slug: `${key}-m`,
              title: "",
              summary: "",
              position: 1,
              published: true,
              created_at: "",
              updated_at: "",
            },
            lessons,
          },
        ]
      : [],
  }) as PhaseWithModules;

describe("deriveRoadmapProgress", () => {
  it("never calls an empty phase complete", () => {
    // The fault this rule exists to prevent: a curriculum that has not been
    // written yet rendering as finished on day one.
    const curriculum = [phase("think", 1, []), phase("research", 2, [])];
    const result = deriveRoadmapProgress(curriculum, new Set());

    assert.deepEqual(result.completed, []);
    assert.equal(result.current, null);
  });

  it("completes a phase only when every lesson in it is done", () => {
    const curriculum = [phase("think", 1, [lesson("a"), lesson("b")])];

    assert.deepEqual(deriveRoadmapProgress(curriculum, new Set(["a"])).completed, []);
    assert.deepEqual(
      deriveRoadmapProgress(curriculum, new Set(["a", "b"])).completed,
      ["think"],
    );
  });

  it("treats a partly finished phase as the current one", () => {
    const curriculum = [phase("think", 1, [lesson("a"), lesson("b")])];
    assert.equal(deriveRoadmapProgress(curriculum, new Set(["a"])).current, "think");
  });

  it("leaves an untouched phase ahead of you rather than under your feet", () => {
    const curriculum = [phase("think", 1, [lesson("a")])];
    assert.equal(deriveRoadmapProgress(curriculum, new Set()).current, null);
  });

  it("goes back to the earliest unfinished phase, not the latest touched", () => {
    const curriculum = [
      phase("think", 1, [lesson("a"), lesson("b")]),
      phase("research", 2, [lesson("c")]),
    ];
    // `a` and `c` done: research is finished, think is not. Think is where you are.
    const result = deriveRoadmapProgress(curriculum, new Set(["a", "c"]));
    assert.equal(result.current, "think");
    assert.deepEqual(result.completed, ["research"]);
  });
});

describe("remainingMinutes", () => {
  it("is null when nothing is published, rather than a confident zero", () => {
    assert.equal(remainingMinutes([phase("think", 1, [])], new Set()), null);
  });

  it("counts only what is left", () => {
    const curriculum = [phase("think", 1, [lesson("a", 10), lesson("b", 25)])];
    assert.equal(remainingMinutes(curriculum, new Set()), 35);
    assert.equal(remainingMinutes(curriculum, new Set(["a"])), 25);
    assert.equal(remainingMinutes(curriculum, new Set(["a", "b"])), 0);
  });
});
