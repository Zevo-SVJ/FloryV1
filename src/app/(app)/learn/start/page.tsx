import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getLearningOverview } from "@/lib/learning/overview";

export const metadata: Metadata = { title: "Start here" };

/**
 * How LOCK works, before anybody has to work it out.
 *
 * The orientation the product did not have. A new learner used to arrive at a
 * sidebar of eighteen destinations and a roadmap of ten phases and was left to
 * infer the relationship between a lesson, a mission, an artifact and the
 * product they were supposedly building. Every one of those relationships is
 * real and load-bearing; none of them was ever stated.
 *
 * Deliberately not a lesson in the database. It describes how the programme
 * works rather than teaching part of it, so it does not belong in a module,
 * should not carry completion or XP, and must not become one more thing to
 * finish. It is short, it is always linked from Learn, and it ends by putting
 * the learner in the first module.
 */
export default async function StartHerePage() {
  const overview = await getLearningOverview();
  const { phases, nextModule, nextLesson } = overview;

  const beginHref = nextModule
    ? `/learn/modules/${nextModule.module.slug}`
    : nextLesson
      ? `/learn/lessons/${nextLesson.lesson.slug}`
      : "/learn";

  return (
    <div className="space-y-14">
      <header className="space-y-4">
        <p className="label text-accent">Start here</p>
        <h1 className="text-display max-w-measure text-balance">Welcome to LOCK</h1>
        <p className="max-w-measure text-lede text-ink-muted">
          You are not here to watch a course. You are here to build a real SaaS —
          one that a real person can use and pay for — and to learn the judgement
          that makes it worth building.
        </p>
      </header>

      {/* ── The loop ─────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          How the programme runs
        </h2>

        <ol className="grid gap-px overflow-hidden rounded-card bg-border sm:grid-cols-5">
          {LOOP.map((step, index) => (
            <li key={step.word} className="bg-canvas p-4">
              <p className="label tabular-nums text-ink-subtle">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-1.5 text-[0.9375rem] font-medium tracking-tight text-ink">
                {step.word}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.line}</p>
            </li>
          ))}
        </ol>

        <p className="max-w-measure text-sm leading-relaxed text-ink-muted">
          That loop runs once per module, and it runs again inside every phase.
          Nothing here rewards reading quickly.
        </p>
      </section>

      {/* ── The vocabulary, stated once ──────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          Four words, and then you can forget them
        </h2>

        <dl className="divide-y divide-border">
          {VOCABULARY.map((item) => (
            <div key={item.term} className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
              <dt className="text-[0.9375rem] font-medium tracking-tight text-ink">
                {item.term}
              </dt>
              <dd className="max-w-measure text-sm leading-relaxed text-ink-muted">
                {item.line}
              </dd>
            </div>
          ))}
        </dl>

        <p className="max-w-measure text-sm leading-relaxed text-ink-muted">
          You never have to navigate those four levels yourself. The programme
          opens the next one for you, and every lesson ends by naming what comes
          after it.
        </p>
      </section>

      {/* ── What you will build ──────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          What you produce is the product
        </h2>

        <ol className="space-y-3">
          {PRODUCTION.map((step, index) => (
            <li key={step} className="flex gap-4 text-[0.9375rem] leading-relaxed text-ink-muted">
              <span className="label w-5 shrink-0 pt-1 tabular-nums text-ink-subtle">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="max-w-measure">{step}</span>
            </li>
          ))}
        </ol>

        <p className="max-w-measure border-l-2 border-accent py-1 pl-4 text-sm leading-relaxed text-ink-muted">
          This is the part that makes LOCK different from a course. There is no
          separate portfolio exercise at the end. The work you do inside the
          programme <em>is</em> the product.
        </p>
      </section>

      {/* ── The journey ──────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          The ten phases
        </h2>

        <ol className="divide-y divide-border">
          {phases.map((phase) => (
            <li
              key={phase.key}
              className="grid gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[3rem_10rem_minmax(0,1fr)]"
            >
              <span className="label pt-1 tabular-nums text-ink-subtle">
                {String(phase.number).padStart(2, "0")}
              </span>
              <span className="text-[0.9375rem] font-medium tracking-tight text-ink">
                {phase.label}
              </span>
              <span className="max-w-measure text-sm leading-relaxed text-ink-muted">
                {phase.summary}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── The rest of the room ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          What else is here
        </h2>

        <dl className="divide-y divide-border">
          {ROOM.map((item) => (
            <div key={item.term} className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
              <dt className="text-[0.9375rem] font-medium tracking-tight text-ink">
                <Link
                  href={item.href}
                  className="underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  {item.term}
                </Link>
              </dt>
              <dd className="max-w-measure text-sm leading-relaxed text-ink-muted">
                {item.line}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── What done means ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="label border-b border-border pb-2 text-ink-subtle">
          What completion means here
        </h2>
        <p className="max-w-measure text-[0.9375rem] leading-relaxed text-ink-muted">
          Finishing a lesson marks a lesson finished. It does not claim you can do
          the thing. Skills move when there is evidence — a mission completed,
          work submitted, work approved by your mentor — which is why nothing
          here can be advanced by clicking through. The number on your progress
          page is meant to be one you would defend.
        </p>
      </section>

      {/* ── Begin ────────────────────────────────────────────────────────── */}
      <section className="rounded-card border border-accent/35 bg-accent-quiet/40 p-6 sm:p-8">
        <p className="label text-accent">You are ready</p>
        <h2 className="mt-2 max-w-measure text-title text-balance">
          {nextModule ? nextModule.module.title : "Open the programme"}
        </h2>
        <p className="mt-2 max-w-measure text-[0.9375rem] leading-relaxed text-ink-muted">
          {nextModule?.module.summary ||
            "The first module opens as soon as it is published."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <ButtonLink href={beginHref}>
            {nextModule ? "Start the first module" : "Back to Learn"}
          </ButtonLink>
          <Link
            href="/learn"
            className="text-sm text-ink-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
          >
            See the whole journey
          </Link>
        </div>
      </section>
    </div>
  );
}

const LOOP = [
  { word: "Learn", line: "A short lesson on one idea, with the reasoning shown." },
  { word: "Decide", line: "You commit to an answer before the lesson gives you one." },
  { word: "Build", line: "A mission turns the idea into something that exists." },
  { word: "Verify", line: "Your mentor reads it and says what is not yet true." },
  { word: "Ship", line: "It goes into your product, and the next phase builds on it." },
] as const;

const VOCABULARY = [
  {
    term: "Phase",
    line: "One of the ten stages of building a SaaS, from finding a problem to growing a product. Think of it as a section of one long course.",
  },
  {
    term: "Module",
    line: "A few lessons and the mission that applies them. This is the unit you actually open and finish — usually under an hour.",
  },
  {
    term: "Lesson",
    line: "One idea, with the parts where you stop and decide something. Eight to fifteen minutes.",
  },
  {
    term: "Mission",
    line: "The work at the end of a module. It produces something real, and that something goes into your SaaS.",
  },
] as const;

const PRODUCTION = [
  "A module teaches you something and ends in a mission.",
  "The mission asks for a deliverable — a problem statement, a set of interview notes, a technical plan.",
  "You submit it, and your mentor reads it and responds.",
  "It becomes an artifact in My SaaS, alongside everything else you have produced.",
  "The next phase takes that artifact as its input. Nothing here is busywork you throw away.",
] as const;

const ROOM = [
  {
    term: "My SaaS",
    href: "/build",
    line: "The product you are building: what it is, every artifact you have produced, and the log of what you decided and why.",
  },
  {
    term: "Toolbox",
    href: "/toolbox/prompts",
    line: "Prompts, templates, frameworks and checklists, plus the tools you build with. Each lesson names the ones it needs, so you never have to go looking.",
  },
  {
    term: "Progress",
    href: "/progress",
    line: "How far you are, which skills have evidence behind them, and the milestones you have actually reached.",
  },
  {
    term: "Mentor",
    href: "/mentor",
    line: "Zevo reads what you submit, tells you what is not yet true, and answers questions you raise.",
  },
] as const;
