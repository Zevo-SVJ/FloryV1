/**
 * The ten phases of the LOCK program.
 *
 * The journey the platform exists to take somebody through, from an idea to a
 * SaaS product that has customers.
 *
 * `public.phases` is the source of truth for phase *content* — a learner's
 * progress, the modules and missions inside each one — and is seeded from this
 * list, keyed on the same strings. This constant survives it because the
 * sequence is a fact about the program rather than data: the navigation, the
 * roadmap's state machine and the type `PhaseKey` all need it at compile time,
 * and none of them should need a database round trip to know that there are ten
 * phases and that Think is the first.
 *
 * Adding a phase means a row and an entry here. Nothing else in the platform
 * hard-codes the list.
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
