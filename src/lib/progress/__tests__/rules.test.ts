import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  roadmapFromPhases,
  focusPhase,
  movingSkills,
  demonstratedSkills,
  skillFraction,
  sortActivity,
  LESSON_WEIGHT,
  MISSION_WEIGHT,
} from "@/lib/progress/rules";
import { SKILL_STATE_RANK, SKILL_AREAS, SKILL_STATE_LABEL } from "@/lib/progress/labels";
import type {
  LearnerActivityRow,
  LearnerPhaseProgressRow,
  LearnerSkillStateRow,
  SkillState,
} from "@/types/database";

/**
 * The progress rules, tested where they are decidable without a database.
 *
 * The percentages themselves are computed in SQL and asserted in
 * `supabase/tests/07_progress.sql` against a real PostgreSQL — deliberately,
 * because a second implementation here would be a second answer to the same
 * question. What these tests cover is the interpretation: which phase is
 * "current", which skills are worth showing, and the ordering rules.
 */

const phase = (
  key: string,
  position: number,
  overrides: Partial<LearnerPhaseProgressRow> = {},
): LearnerPhaseProgressRow => ({
  profile_id: "p",
  phase_key: key,
  position,
  label: key,
  summary: "",
  lessons_total: 0,
  lessons_done: 0,
  missions_total: 0,
  missions_done: 0,
  units_total: 0,
  units_done: 0,
  percent: null,
  ...overrides,
});

const skill = (
  key: string,
  state: SkillState,
  overrides: Partial<LearnerSkillStateRow> = {},
): LearnerSkillStateRow => ({
  profile_id: "p",
  skill_key: key,
  area: "build",
  label: key,
  summary: "",
  demonstrates: "",
  position: 1,
  lessons_count: 0,
  missions_count: 0,
  approvals_count: 0,
  last_evidence_at: null,
  state,
  ...overrides,
});

describe("the weights", () => {
  test("are the ones the SQL view applies", () => {
    /*
     * These constants exist so the interface can *show* the rule. If they ever
     * drift from `learner_phase_progress`, the percentages on screen would be
     * explained by a sentence that is no longer true — which is worse than
     * showing no explanation at all. Suite 07 asserts the SQL side: two
     * lessons and one mission make five units.
     */
    assert.equal(LESSON_WEIGHT, 1);
    assert.equal(MISSION_WEIGHT, 3);
    assert.equal(2 * LESSON_WEIGHT + 1 * MISSION_WEIGHT, 5);
  });
});

describe("roadmapFromPhases", () => {
  test("marks nothing current when nothing has been started", () => {
    const result = roadmapFromPhases([
      phase("think", 1, { units_total: 5, units_done: 0, percent: 0 }),
      phase("research", 2, { units_total: 4, units_done: 0, percent: 0 }),
    ]);
    assert.deepEqual(result, { completed: [], current: null });
  });

  test("a phase with nothing published is never complete", () => {
    /*
     * The rule the whole roadmap depends on today. Most of the curriculum is
     * unwritten, and without this every empty phase would render as finished
     * on day one — the single most misleading thing this screen could do.
     */
    const result = roadmapFromPhases([
      phase("think", 1, { units_total: 0, units_done: 0, percent: null }),
      phase("research", 2, { units_total: 0, units_done: 0, percent: null }),
    ]);
    assert.deepEqual(result, { completed: [], current: null });
  });

  test("the current phase is the earliest unfinished one that has been started", () => {
    const result = roadmapFromPhases([
      phase("think", 1, { units_total: 5, units_done: 5, percent: 100 }),
      phase("research", 2, { units_total: 4, units_done: 1, percent: 25 }),
      phase("validate", 3, { units_total: 6, units_done: 3, percent: 50 }),
    ]);
    assert.deepEqual(result.completed, ["think"]);
    assert.equal(result.current, "research");
  });

  test("does not depend on the order the rows arrive in", () => {
    const rows = [
      phase("validate", 3, { units_total: 6, units_done: 3, percent: 50 }),
      phase("think", 1, { units_total: 5, units_done: 5, percent: 100 }),
      phase("research", 2, { units_total: 4, units_done: 1, percent: 25 }),
    ];
    assert.equal(roadmapFromPhases(rows).current, "research");
    assert.equal(roadmapFromPhases([...rows].reverse()).current, "research");
  });
});

describe("focusPhase", () => {
  test("is null when nothing is published anywhere", () => {
    assert.equal(focusPhase([phase("think", 1), phase("research", 2)]), null);
  });

  test("prefers a phase in progress over the first available one", () => {
    const result = focusPhase([
      phase("think", 1, { units_total: 5, units_done: 0, percent: 0 }),
      phase("research", 2, { units_total: 4, units_done: 2, percent: 50 }),
    ]);
    assert.equal(result?.phase_key, "research");
  });

  test("falls back to the first unfinished phase with content", () => {
    const result = focusPhase([
      phase("think", 1, { units_total: 5, units_done: 5, percent: 100 }),
      phase("research", 2, { units_total: 4, units_done: 0, percent: 0 }),
    ]);
    assert.equal(result?.phase_key, "research");
  });

  test("is null when every published phase is finished", () => {
    const result = focusPhase([
      phase("think", 1, { units_total: 5, units_done: 5, percent: 100 }),
      phase("grow", 10, { units_total: 0, percent: null }),
    ]);
    assert.equal(result, null);
  });
});

describe("skill states", () => {
  test("rank in the order the states mean something", () => {
    assert.ok(SKILL_STATE_RANK.not_started < SKILL_STATE_RANK.introduced);
    assert.ok(SKILL_STATE_RANK.introduced < SKILL_STATE_RANK.practicing);
    assert.ok(SKILL_STATE_RANK.practicing < SKILL_STATE_RANK.demonstrated);
    assert.ok(SKILL_STATE_RANK.demonstrated < SKILL_STATE_RANK.strong);
  });

  test("introduced sits below demonstrated — completion is not mastery", () => {
    assert.ok(SKILL_STATE_RANK.introduced < SKILL_STATE_RANK.demonstrated);
    assert.ok(skillFraction("introduced") < skillFraction("demonstrated"));
    assert.equal(skillFraction("not_started"), 0);
    assert.equal(skillFraction("strong"), 1);
  });

  test("every state has a label", () => {
    for (const state of Object.keys(SKILL_STATE_RANK) as SkillState[]) {
      assert.ok(SKILL_STATE_LABEL[state].length > 0);
    }
  });
});

describe("movingSkills", () => {
  test("excludes anything with no evidence at all", () => {
    const result = movingSkills([
      skill("a", "not_started"),
      skill("b", "introduced"),
    ]);
    assert.deepEqual(result.map((row) => row.skill_key), ["b"]);
  });

  test("puts the furthest-along first, then the most recent", () => {
    const result = movingSkills([
      skill("intro", "introduced", { last_evidence_at: "2026-09-05T00:00:00Z" }),
      skill("strong", "strong", { last_evidence_at: "2026-09-01T00:00:00Z" }),
      skill("old-practice", "practicing", { last_evidence_at: "2026-09-01T00:00:00Z" }),
      skill("new-practice", "practicing", { last_evidence_at: "2026-09-04T00:00:00Z" }),
    ]);
    assert.deepEqual(result.map((row) => row.skill_key), [
      "strong",
      "new-practice",
      "old-practice",
      "intro",
    ]);
  });

  test("honours the limit", () => {
    const rows = ["a", "b", "c", "d", "e"].map((key) => skill(key, "practicing"));
    assert.equal(movingSkills(rows, 2).length, 2);
  });

  test("is empty for a brand-new learner", () => {
    const rows = ["a", "b"].map((key) => skill(key, "not_started"));
    assert.deepEqual(movingSkills(rows), []);
  });
});

describe("demonstratedSkills", () => {
  test("takes demonstrated and strong, and nothing beneath", () => {
    const result = demonstratedSkills([
      skill("a", "practicing"),
      skill("b", "demonstrated"),
      skill("c", "strong"),
      skill("d", "introduced"),
    ]);
    assert.deepEqual(result.map((row) => row.skill_key), ["c", "b"]);
  });
});

describe("sortActivity", () => {
  test("is newest first, whatever the union returned", () => {
    const entry = (occurred_at: string, title: string): LearnerActivityRow => ({
      profile_id: "p",
      source: "lesson",
      occurred_at,
      title,
      detail: "",
      mission_id: null,
      artifact_id: null,
      lesson_id: null,
      milestone_key: null,
    });

    const result = sortActivity([
      entry("2026-09-01T00:00:00Z", "first"),
      entry("2026-09-05T00:00:00Z", "latest"),
      entry("2026-09-03T00:00:00Z", "middle"),
    ]);
    assert.deepEqual(result.map((row) => row.title), ["latest", "middle", "first"]);
  });

  test("does not mutate its argument", () => {
    const rows: LearnerActivityRow[] = [];
    assert.notEqual(sortActivity(rows), rows);
  });
});

describe("the skill areas", () => {
  test("are listed once each, in the order the work happens", () => {
    assert.equal(new Set(SKILL_AREAS).size, SKILL_AREAS.length);
    assert.deepEqual(SKILL_AREAS[0], "thinking");
    assert.deepEqual(SKILL_AREAS.at(-1), "business");
  });
});
