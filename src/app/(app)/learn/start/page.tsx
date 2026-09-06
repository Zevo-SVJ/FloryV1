import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow, Row } from "@/components/ui/list";
import { Icon } from "@/components/ui/icon";
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
    <Screen
      title="Welcome to LOCK"
      eyebrow={<span className="text-accent">Start here</span>}
      back={{ href: "/learn", label: "Learn" }}
      width="read"
      lede="You are not here to watch a course. You are here to build a real SaaS — one that a real person can use and pay for — and to learn the judgement that makes it worth building."
    >
      <div className="space-y-12">

      {/* ── The loop ─────────────────────────────────────────────────────── */}
      <Group
        title="How the programme runs"
        className="rise"
        footnote="That loop runs once per module, and again inside every phase. Nothing here rewards reading quickly."
      >
        {LOOP.map((step, index) => (
          <Row
            key={step.word}
            align="start"
            leading={
              <span className="flex size-7 items-center justify-center rounded-full bg-accent/10 font-mono text-caption tabular-nums text-accent">
                {index + 1}
              </span>
            }
            title={step.word}
            detail={step.line}
          />
        ))}
      </Group>

      {/* ── The vocabulary, stated once ──────────────────────────────────── */}
      <Group
        title="Four words, and then you can forget them"
        className="rise rise-1"
        footnote="You never have to navigate those four levels yourself. The programme opens the next one for you, and every lesson ends by naming what comes after it."
      >
        {VOCABULARY.map((item) => (
          <Row key={item.term} align="start" title={item.term} detail={item.line} />
        ))}
      </Group>

      {/* ── What you will build ──────────────────────────────────────────── */}
      <section className="rise rise-2">
        <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          What you produce is the product
        </h2>

        <ol className="space-y-3">
          {PRODUCTION.map((step, index) => (
            <li key={step} className="flex gap-3.5 text-body text-ink-muted">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] font-mono text-caption tabular-nums text-ink-subtle">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-5 rounded-card bg-accent-quiet/70 px-4 py-3.5 text-subhead text-ink-muted">
          This is the part that makes LOCK different from a course. There is no
          separate portfolio exercise at the end. The work you do inside the
          programme <em>is</em> the product.
        </p>
      </section>

      {/* ── The journey ──────────────────────────────────────────────────── */}
      <Group title="The ten phases" className="rise rise-3">
        {phases.map((phase) => (
          <Row
            key={phase.key}
            align="start"
            leading={
              <span className="flex size-7 items-center justify-center font-mono text-footnote tabular-nums text-ink-subtle">
                {String(phase.number).padStart(2, "0")}
              </span>
            }
            title={phase.label}
            detail={phase.summary}
          />
        ))}
      </Group>

      {/* ── The rest of the room ─────────────────────────────────────────── */}
      <Group title="What else is here">
        {ROOM.map((item) => (
          <LinkRow
            key={item.term}
            href={item.href}
            align="start"
            leading={<Icon name={item.icon} className="size-[1.15rem] text-ink-subtle" />}
            title={item.term}
            detail={item.line}
          />
        ))}
      </Group>

      {/* ── What done means ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          What completion means here
        </h2>
        <p className="text-body text-ink-muted">
          Finishing a lesson marks a lesson finished. It does not claim you can do
          the thing. Skills move when there is evidence — a mission completed,
          work submitted, work approved by your mentor — which is why nothing
          here can be advanced by clicking through. The number on your progress
          page is meant to be one you would defend.
        </p>
      </section>

      {/* ── Begin ────────────────────────────────────────────────────────── */}
      <section className="rounded-card bg-accent-quiet/70 p-6 sm:p-8">
        <p className="text-footnote font-semibold tracking-[0.01em] text-accent uppercase">
          You are ready
        </p>
        <h2 className="mt-3 text-title2">
          {nextModule ? nextModule.module.title : "Open the programme"}
        </h2>
        <p className="mt-2 text-body text-ink-muted">
          {nextModule?.module.summary ||
            "The first module opens as soon as it is published."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <ButtonLink href={beginHref} variant="accent">
            {nextModule ? "Start the first module" : "Back to Learn"}
            <Icon name="forward" className="size-[1.05rem]" strokeWidth="2.2" />
          </ButtonLink>
          <Link
            href="/learn"
            className="tactile text-subhead text-ink-muted underline decoration-ink/20 underline-offset-4 hover:text-ink"
          >
            See the whole journey
          </Link>
        </div>
      </section>
      </div>
    </Screen>
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
    icon: "build" as const,
    line: "The product you are building: what it is, every artifact you have produced, and the log of what you decided and why.",
  },
  {
    term: "Toolbox",
    href: "/toolbox",
    icon: "toolbox" as const,
    line: "Prompts, templates, frameworks and checklists, plus the tools you build with. Each lesson names the ones it needs, so you never have to go looking.",
  },
  {
    term: "Progress",
    href: "/progress",
    icon: "progress" as const,
    line: "How far you are, which skills have evidence behind them, and the milestones you have actually reached.",
  },
  {
    term: "Mentor",
    href: "/mentor",
    icon: "mentor" as const,
    line: "Zevo reads what you submit, tells you what is not yet true, and answers questions you raise.",
  },
] as const;
