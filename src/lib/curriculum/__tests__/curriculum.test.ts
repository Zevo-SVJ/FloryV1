import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CURRICULUM,
  FORBIDDEN_PHRASES,
  allLessons,
  allMissions,
  allModules,
} from "@/lib/curriculum";
import { blockSchema } from "@/lib/learning/blocks";
import { PHASES } from "@/lib/lock/phases";

/**
 * The curriculum's own tests.
 *
 * Content is code here, so it gets the same treatment: every block goes through
 * the real schema the renderer reads, and the editorial rules that matter are
 * assertions rather than intentions. A lesson that gates completion on a
 * reflection, or a phase that quietly reintroduces the word "placeholder",
 * fails `npm test` rather than being noticed by a learner.
 */

const SLUG = /^[a-z0-9][a-z0-9-]{1,120}$/;

describe("shape", () => {
  it("covers all ten phases, in the order the product declares", () => {
    assert.deepEqual(
      CURRICULUM.map((phase) => phase.key),
      PHASES.map((phase) => phase.key),
    );
  });

  it("gives every phase at least one module, and every module at least one lesson", () => {
    for (const phase of CURRICULUM) {
      assert.ok(phase.modules.length > 0, `${phase.key} has no modules`);
      for (const entry of phase.modules) {
        assert.ok(entry.lessons.length > 0, `${entry.slug} has no lessons`);
      }
    }
  });

  it("ends every phase in at least one mission", () => {
    for (const phase of CURRICULUM) {
      const missions = phase.modules.filter((entry) => entry.mission).length;
      assert.ok(missions > 0, `${phase.key} produces no artifact`);
    }
  });

  it("uses well-formed, unique slugs everywhere", () => {
    const seen = new Set<string>();
    for (const entry of allModules()) {
      const slug = entry.module.slug;
      assert.match(slug, SLUG, `module slug ${slug}`);
      assert.ok(!seen.has(slug), `duplicate slug ${slug}`);
      seen.add(slug);
    }
    for (const lesson of allLessons()) {
      assert.match(lesson.slug, SLUG, `lesson slug ${lesson.slug}`);
      assert.ok(!seen.has(lesson.slug), `duplicate slug ${lesson.slug}`);
      seen.add(lesson.slug);
    }
    for (const mission of allMissions()) {
      assert.match(mission.slug, SLUG, `mission slug ${mission.slug}`);
      assert.ok(!seen.has(mission.slug), `duplicate slug ${mission.slug}`);
      seen.add(mission.slug);
    }
  });
});

describe("blocks", () => {
  it("parses every block through the schema the renderer uses", () => {
    for (const lesson of allLessons()) {
      assert.ok(lesson.blocks.length > 0, `${lesson.slug} has no content`);
      for (const block of lesson.blocks) {
        const parsed = blockSchema.safeParse(block);
        assert.ok(parsed.success, `${lesson.slug}/${block.id}: ${JSON.stringify(parsed.error?.issues)}`);
      }
    }
    for (const mission of allMissions()) {
      for (const block of mission.blocks) {
        const parsed = blockSchema.safeParse(block);
        assert.ok(parsed.success, `${mission.slug}/${block.id}: ${JSON.stringify(parsed.error?.issues)}`);
      }
    }
  });

  it("gives every block in a lesson a unique id", () => {
    for (const lesson of allLessons()) {
      const ids = lesson.blocks.map((block) => block.id);
      assert.equal(new Set(ids).size, ids.length, `${lesson.slug} repeats a block id`);
    }
  });

  it("never opens a lesson with a question", () => {
    /*
     * Teach before asking. A lesson whose first block asks for an answer is
     * asking the learner to invent something they have not been taught.
     */
    const asks = new Set([
      "choice", "boolean", "ordering", "short_answer",
      "decision", "predict", "your_move", "reflection",
    ]);
    for (const lesson of allLessons()) {
      const first = lesson.blocks[0];
      assert.ok(first && !asks.has(first.kind), `${lesson.slug} opens with a question`);
    }
  });
});

describe("questions and completion", () => {
  it("never gates a lesson on a subjective answer", () => {
    /*
     * The rule this whole content pass exists to enforce. The database can gate
     * completion on a decision or a reflection; the curriculum must not, because
     * a learner should never be blocked from continuing by a question that has
     * no defensible answer.
     */
    for (const lesson of allLessons()) {
      assert.ok(
        lesson.completion === "read" || lesson.completion === "knowledge_check",
        `${lesson.slug} gates completion on ${lesson.completion}`,
      );
    }
  });

  it("only requires a knowledge check where the lesson contains a graded question", () => {
    const graded = new Set(["choice", "boolean", "ordering"]);
    for (const lesson of allLessons()) {
      if (lesson.completion !== "knowledge_check") continue;
      assert.ok(
        lesson.blocks.some((block) => graded.has(block.kind)),
        `${lesson.slug} requires a check it does not contain`,
      );
    }
  });

  it("explains every graded question, whatever the learner answers", () => {
    for (const lesson of allLessons()) {
      for (const block of lesson.blocks) {
        if (block.kind === "choice" || block.kind === "boolean" || block.kind === "ordering") {
          assert.ok(
            block.explanation.length > 40,
            `${lesson.slug}/${block.id} has no real explanation`,
          );
        }
      }
    }
  });

  it("gives every judgement block an honest 'not sure' option", () => {
    /*
     * A decision block is ungraded by design and its options are tradeoffs. Where
     * uncertainty is legitimate — which is most of the time this early — the
     * learner needs somewhere to put it that is not a wrong answer.
     */
    for (const lesson of allLessons()) {
      for (const block of lesson.blocks) {
        if (block.kind !== "decision") continue;
        const hasUnsure = block.options.some((option) =>
          /not sure|don't know|do not know|unsure/i.test(option.label),
        );
        assert.ok(hasUnsure, `${lesson.slug}/${block.id} offers no honest uncertainty`);
      }
    }
  });

  it("marks every optional exercise as optional in its own words", () => {
    for (const lesson of allLessons()) {
      for (const block of lesson.blocks) {
        if (block.kind === "reflection") {
          assert.match(block.prompt, /optional/i, `${lesson.slug}/${block.id} does not say it is optional`);
        }
        if (block.kind === "predict") {
          assert.match(block.prompt, /optional/i, `${lesson.slug}/${block.id} does not say it is optional`);
        }
      }
    }
  });
});

describe("references", () => {
  const lessonSlugs = new Set(allLessons().map((lesson) => lesson.slug));

  it("resolves every prerequisite to a lesson that exists", () => {
    for (const lesson of allLessons()) {
      for (const slug of lesson.requires ?? []) {
        assert.ok(lessonSlugs.has(slug), `${lesson.slug} requires missing ${slug}`);
        assert.notEqual(slug, lesson.slug, `${lesson.slug} requires itself`);
      }
    }
  });

  it("keeps prerequisites pointing backwards, so nothing is unreachable", () => {
    const order = allLessons().map((lesson) => lesson.slug);
    for (const lesson of allLessons()) {
      const here = order.indexOf(lesson.slug);
      for (const slug of lesson.requires ?? []) {
        assert.ok(
          order.indexOf(slug) < here,
          `${lesson.slug} requires ${slug}, which comes later`,
        );
      }
    }
  });

  it("resolves every mission's required lesson", () => {
    for (const mission of allMissions()) {
      if (!mission.requiresLesson) continue;
      assert.ok(
        lessonSlugs.has(mission.requiresLesson),
        `${mission.slug} requires missing lesson ${mission.requiresLesson}`,
      );
    }
  });

  it("gives every mission a deliverable and at least one kind of evidence", () => {
    for (const mission of allMissions()) {
      assert.ok(mission.deliverableTitle.length > 2, `${mission.slug} has no deliverable`);
      assert.ok(
        mission.requiredEvidence.length > 0,
        `${mission.slug} asks for no evidence`,
      );
    }
  });
});

describe("editorial", () => {
  const strings = (value: unknown, out: string[] = []): string[] => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) for (const item of value) strings(item, out);
    else if (value && typeof value === "object")
      for (const item of Object.values(value)) strings(item, out);
    return out;
  };

  it("contains no placeholder language anywhere a learner can see", () => {
    for (const phase of CURRICULUM) {
      for (const text of strings(phase)) {
        const lower = text.toLowerCase();
        for (const phrase of FORBIDDEN_PHRASES) {
          assert.ok(
            !lower.includes(phrase),
            `"${phrase}" appears in the curriculum: ${text.slice(0, 90)}`,
          );
        }
      }
    }
  });

  it("gives every lesson a summary and at least one objective", () => {
    for (const lesson of allLessons()) {
      assert.ok(lesson.summary.length > 20, `${lesson.slug} has a thin summary`);
      assert.ok(lesson.objectives.length > 0, `${lesson.slug} claims no outcome`);
    }
  });

  it("keeps lessons short enough to finish in a sitting", () => {
    for (const lesson of allLessons()) {
      assert.ok(
        lesson.minutes >= 5 && lesson.minutes <= 20,
        `${lesson.slug} is ${lesson.minutes} minutes`,
      );
    }
  });

  it("says why every external resource is worth the learner's time", () => {
    for (const lesson of allLessons()) {
      for (const block of lesson.blocks) {
        if (block.kind !== "video") continue;
        assert.ok(block.why.length > 30, `${lesson.slug}/${block.id} does not say why to watch`);
        assert.match(block.url, /^https:\/\//, `${lesson.slug}/${block.id} is not a secure URL`);
      }
    }
  });
});
