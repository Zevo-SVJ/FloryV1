/**
 * The ten phases of the LOCK program.
 *
 * The journey the platform exists to take somebody through, from an idea to a
 * SaaS product that has customers. It is stated here as a typed constant rather
 * than as database rows, deliberately: the sequence is fixed and known, the
 * navigation and dashboard need to name it today, and turning it into content —
 * modules, lessons, missions, deliverables — is Prompt 3's job and Prompt 8's
 * job. Choosing the table shape now, before the content it has to hold exists,
 * would be choosing it blind.
 *
 * When the learning engine arrives, `phases` becomes a table seeded from this
 * list, keyed on `key` so that anything already written against these
 * identifiers keeps working. That migration is a seed script, not a rewrite.
 *
 * These are phases, not curriculum. No lesson, module or mission is invented
 * here — the curriculum is designed before the content prompts, as it should
 * be.
 */

export type PhaseKey =
  | "think"
  | "research"
  | "validate"
  | "product"
  | "design"
  | "build"
  | "test"
  | "ship"
  | "monetize"
  | "grow";

export interface Phase {
  key: PhaseKey;
  /** 1-based, and shown. The order is part of the meaning. */
  number: number;
  label: string;
  /** What the learner walks out of this phase holding. */
  summary: string;
}

export const PHASES: readonly Phase[] = [
  { key: "think", number: 1, label: "Think", summary: "Find a problem worth solving, and decide it is yours." },
  { key: "research", number: 2, label: "Research", summary: "Learn the market, the alternatives and the people in it." },
  { key: "validate", number: 3, label: "Validate", summary: "Get evidence before you get a codebase." },
  { key: "product", number: 4, label: "Product", summary: "Turn a validated problem into a defined product." },
  { key: "design", number: 5, label: "Design", summary: "Decide how it looks, reads and behaves." },
  { key: "build", number: 6, label: "Build", summary: "Direct the execution layer and ship real software." },
  { key: "test", number: 7, label: "Test", summary: "Verify it works, and prove it rather than assume it." },
  { key: "ship", number: 8, label: "Ship", summary: "Put it in front of real people, in production." },
  { key: "monetize", number: 9, label: "Monetize", summary: "Charge for it, and understand why somebody pays." },
  { key: "grow", number: 10, label: "Grow", summary: "Find the channel that works and run it." },
] as const;

export const phaseByKey = (key: PhaseKey): Phase | undefined =>
  PHASES.find((phase) => phase.key === key);
