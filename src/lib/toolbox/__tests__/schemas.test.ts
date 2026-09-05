import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KIND_LABEL, KIND_PATH, KIND_PLURAL, TOOLBOX_KINDS, parseToolboxBody,
} from "@/lib/toolbox/schemas";

/**
 * The body is JSONB, so this parser is the only thing standing between the
 * database and a renderer. These assertions are about what it refuses.
 */

const validPrompt = {
  whatItDoes: "Argues against your idea.",
  whenToUse: "Before you commit a weekend.",
  prompt: "CONTEXT\n…",
  howToUse: "Replace the inputs.",
  expectedOutput: "An uncomfortable list.",
  commonMistake: "Describing the solution.",
  variables: [{ token: "[IDEA]", description: "One sentence." }],
};

describe("parseToolboxBody", () => {
  it("parses a well-formed prompt and narrows its type", () => {
    const parsed = parseToolboxBody("prompt", validPrompt);
    assert.ok(parsed);
    assert.equal(parsed.kind, "prompt");
    if (parsed.kind === "prompt") {
      assert.equal(parsed.body.variables[0]?.token, "[IDEA]");
    }
  });

  it("defaults variables rather than demanding them", () => {
    const { variables: _omitted, ...withoutVariables } = validPrompt;
    const parsed = parseToolboxBody("prompt", withoutVariables);
    assert.ok(parsed);
    if (parsed.kind === "prompt") assert.deepEqual(parsed.body.variables, []);
  });

  it("refuses a prompt missing the fields that make it useful", () => {
    // A prompt with no "when to use" is a prompt somebody will use wrongly.
    const { whenToUse: _omitted, ...incomplete } = validPrompt;
    assert.equal(parseToolboxBody("prompt", incomplete), null);
  });

  it("refuses a resource whose reason is a shrug", () => {
    const base = { resourceKind: "doc", url: "https://example.com" };
    // Under twenty characters. "Watch this video" is not a reason.
    assert.equal(parseToolboxBody("resource", { ...base, why: "Useful." }), null);
    assert.ok(
      parseToolboxBody("resource", {
        ...base,
        why: "Read it before writing your first policy, not after your first leak.",
      }),
    );
  });

  it("refuses a resource with a URL that is not one", () => {
    assert.equal(
      parseToolboxBody("resource", {
        resourceKind: "doc",
        url: "not-a-url",
        why: "A perfectly good reason that is long enough.",
      }),
      null,
    );
  });

  it("refuses a checklist item with no id", () => {
    // Ticks are keyed on the id. The database refuses this too; both layers
    // check, because content can be authored by either.
    assert.equal(
      parseToolboxBody("checklist", {
        intro: "Before you start.",
        groups: [{ title: "G", items: [{ label: "no id here" }] }],
      }),
      null,
    );
  });

  it("refuses an empty checklist or framework rather than rendering a shell", () => {
    assert.equal(parseToolboxBody("checklist", { intro: "x", groups: [] }), null);
    assert.equal(
      parseToolboxBody("framework", {
        purpose: "p", explanation: "e", steps: [], example: "x",
        whenToUse: "w", commonMistake: "m",
      }),
      null,
    );
  });

  it("returns null for a kind it has never heard of", () => {
    assert.equal(parseToolboxBody("podcast", {}), null);
    assert.equal(parseToolboxBody("prompt", null), null);
    assert.equal(parseToolboxBody("prompt", "a string"), null);
  });
});

describe("the kind tables", () => {
  it("name every kind exactly once, in all three tables", () => {
    for (const kind of TOOLBOX_KINDS) {
      assert.ok(KIND_LABEL[kind], `no label for ${kind}`);
      assert.ok(KIND_PLURAL[kind], `no plural for ${kind}`);
      assert.ok(KIND_PATH[kind]?.startsWith("/"), `no path for ${kind}`);
    }
    assert.equal(new Set(Object.values(KIND_LABEL)).size, TOOLBOX_KINDS.length);
  });

  it("sends resources to the Resources section rather than a Toolbox route", () => {
    // One library, two places it surfaces. The path table is what keeps the
    // navigation honest about that.
    assert.ok(KIND_PATH.resource.startsWith("/resources"));
    assert.ok(KIND_PATH.prompt.startsWith("/toolbox"));
  });
});
