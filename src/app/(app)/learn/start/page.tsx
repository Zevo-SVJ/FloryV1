import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Group, LinkRow, Row } from "@/components/ui/list";
import { Icon } from "@/components/ui/icon";
import { getLearningOverview } from "@/lib/learning/overview";

export const metadata: Metadata = { title: "Start here" };

/**
 * Orientation, and nothing else.
 *
 * This replaced a lesson called "How LOCK teaches", which explained the
 * platform's own content architecture — concept blocks, knowledge checks,
 * reflections — to somebody who had come to learn how to build a product. That
 * was a demonstration of the engine wearing the costume of a lesson, and it
 * taught nothing a founder needs.
 *
 * What a new learner actually needs is the answer to nine questions, once:
 * what this is, what they will build, how it runs, what is expected of them,
 * where the AI fits and where it does not, where their work goes, when to ask
 * the mentor, and what finishing means. Five minutes, then out.
 *
 * It is deliberately not a lesson in the database. It describes the programme
 * rather than teaching part of it, so it carries no completion, no XP and no
 * progress — it must never become one more thing to finish.
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
      title="You are here to build a real SaaS"
      eyebrow={<span className="text-accent">Start here</span>}
      back={{ href: "/learn", label: "Learn" }}
      width="read"
      lede="Not to watch a course. By the end you will have a product in production that somebody other than you has used and paid for — and, more importantly, you will know how to do it again without this."
    >
      <div className="space-y-12">
        {/* ── How it runs ────────────────────────────────────────────────── */}
        <Group
          title="How the programme runs"
          className="rise"
          footnote="That loop runs once inside every module, and again across the ten phases. Nothing here rewards reading quickly."
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

        {/* ── What is expected ───────────────────────────────────────────── */}
        <section className="rise rise-1">
          <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
            What is expected of you
          </h2>
          <p className="text-body text-ink-muted">
            Lessons are short and you read them. Missions are the real work, and
            they happen outside this screen — talking to people, writing a
            decision down, building something, shipping it. A lesson takes ten
            minutes; a mission can take a day.
          </p>
          <p className="mt-4 text-body text-ink-muted">
            You are never blocked by a question. Some lessons end with a check on
            something they just taught, and those you do have to get right —
            because getting it wrong means the lesson did not land. Everything
            else — predictions, judgement calls, reflections — is optional, and
            skipping it costs you nothing.
          </p>
        </section>

        {/* ── The division of labour ─────────────────────────────────────── */}
        <section className="rise rise-2">
          <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
            Your job, and the AI&rsquo;s
          </h2>
          <p className="text-body text-ink-muted">
            You will direct an execution layer — Claude Code or something like
            it — to write most of the software. That is not a shortcut around
            learning to build. It moves the skill: from typing code to deciding
            what should exist, and then checking that what came back is actually
            right.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card bg-accent-quiet/70 px-4 py-3.5">
              <p className="text-footnote font-semibold tracking-[0.01em] text-accent uppercase">
                Never delegated
              </p>
              <ul className="mt-2 space-y-1.5 text-subhead text-ink-muted">
                <li>What to build, and what to leave out</li>
                <li>Whether the result is actually correct</li>
                <li>Security and who can see what</li>
                <li>Whether it is worth building at all</li>
              </ul>
            </div>
            <div className="rounded-card bg-ink/[0.035] px-4 py-3.5">
              <p className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
                Mostly the model
              </p>
              <ul className="mt-2 space-y-1.5 text-subhead text-ink-muted">
                <li>Implementing a task you have defined</li>
                <li>Boilerplate and wiring</li>
                <li>Repetitive edits across many files</li>
                <li>Explaining code you do not understand</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-body text-ink-muted">
            The rule this programme keeps returning to: never accept a change you
            could not explain to somebody else in two sentences. Not write
            yourself — explain. That is a much lower bar, and it is enough to
            stay in control of your own product.
          </p>
        </section>

        {/* ── Where the work goes ────────────────────────────────────────── */}
        <section className="rise rise-3">
          <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
            Everything you produce is the product
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
            There is no portfolio exercise at the end. The work you do inside the
            programme <em>is</em> the product, and each phase takes the previous
            phase&rsquo;s output as its input.
          </p>
        </section>

        {/* ── The journey ────────────────────────────────────────────────── */}
        <Group
          title="The ten phases"
          footnote="One journey, not ten courses. Each phase is roughly two to four weeks of real work, and you can go faster or slower."
        >
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

        {/* ── The mentor ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
            When to ask your mentor
          </h2>
          <p className="text-body text-ink-muted">
            Every mission deliverable goes to Zevo for review, and that is the
            main loop: you produce something, it comes back with what is not yet
            true about it, you fix it. Between reviews, ask when you are stuck on
            a decision rather than on a bug — a debugger cannot tell you whether
            a problem is worth solving, and an execution layer will agree with
            whatever you propose.
          </p>
        </section>

        {/* ── What done means ────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 px-1 text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
            What finishing means
          </h2>
          <p className="text-body text-ink-muted">
            Not that every lesson is ticked. It means there is a product in
            production that somebody other than you has used, a record of the
            decisions that got it there, and a loop you can run again without
            being told to. Progress here moves on evidence — work completed, work
            submitted, work approved — so nothing can be advanced by clicking
            through.
          </p>
        </section>

        {/* ── Other places ───────────────────────────────────────────────── */}
        <Group title="Where everything lives">
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

        {/* ── Begin ──────────────────────────────────────────────────────── */}
        <section className="rounded-card bg-accent-quiet/70 p-6 sm:p-8">
          <p className="text-footnote font-semibold tracking-[0.01em] text-accent uppercase">
            That is everything you needed to know
          </p>
          <h2 className="mt-3 text-title2">
            {nextModule ? nextModule.module.title : "Open the programme"}
          </h2>
          <p className="mt-2 text-body text-ink-muted">
            {nextModule?.module.summary ||
              "Learn shows the whole programme and where to begin."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <ButtonLink href={beginHref} variant="accent">
              Start building
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
  { word: "Learn", line: "A short lesson on one idea, with the reasoning shown rather than asserted." },
  { word: "Decide", line: "You commit to a judgement before the lesson gives you its answer." },
  { word: "Build", line: "A mission turns the idea into something that exists outside your head." },
  { word: "Verify", line: "Your mentor reads it and tells you what is not yet true about it." },
  { word: "Ship", line: "It goes into your product, and the next phase builds on it." },
] as const;

const PRODUCTION = [
  "A module teaches you something and ends in a mission.",
  "The mission asks for a deliverable — a problem statement, interview notes, a technical plan, a deployed build.",
  "You submit it, and your mentor responds with what is missing rather than a grade.",
  "It becomes an artifact in My SaaS, alongside everything else you have produced.",
  "The next phase takes that artifact as its input. Nothing here is thrown away.",
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
    line: "Prompts, templates, frameworks and checklists. Each lesson names the ones it needs, so you never have to go looking.",
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
