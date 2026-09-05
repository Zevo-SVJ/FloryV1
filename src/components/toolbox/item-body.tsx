import Link from "next/link";
import { Card, Label } from "@/components/ui/surface";
import { CopyButton } from "@/components/toolbox/controls";
import { ChecklistControl } from "@/components/toolbox/controls";
import type { ToolboxBody } from "@/lib/toolbox/schemas";

/**
 * One item's body, dispatched on its kind.
 *
 * A `switch` over the discriminated union, for the same reason the lesson block
 * renderer uses one: each branch gets the exact body type, and the `default`
 * assigning to `never` makes a forgotten kind a compile error rather than a
 * blank page.
 *
 * Adding a kind is a schema, a case here, and an enum value in the migration.
 */
export function ToolboxItemBody({
  parsed,
  itemId,
  checkedIds,
  path,
}: {
  parsed: ToolboxBody;
  itemId: string;
  checkedIds: string[];
  path: string;
}) {
  switch (parsed.kind) {
    case "prompt": {
      const body = parsed.body;
      return (
        <div className="max-w-measure space-y-6">
          <Section label="What it does">{body.whatItDoes}</Section>
          <Section label="When to use it">{body.whenToUse}</Section>

          <div className="space-y-3">
            <Label>The prompt</Label>
            {body.variables.length > 0 ? (
              <p className="text-sm text-ink-subtle">
                Replace{" "}
                {body.variables.map((variable, index) => (
                  <span key={variable.token}>
                    {index > 0 ? ", " : ""}
                    <code className="font-mono text-ink">{variable.token}</code>
                  </span>
                ))}{" "}
                before sending.
              </p>
            ) : null}

            <div className="overflow-hidden rounded-card border border-border bg-surface-sunken">
              <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink">
                {body.prompt}
              </pre>
            </div>

            <CopyButton text={body.prompt} />
          </div>

          {body.variables.length > 0 ? (
            <div className="space-y-2">
              <Label>Inputs</Label>
              <dl className="space-y-2">
                {body.variables.map((variable) => (
                  <div key={variable.token} className="flex flex-wrap gap-x-3 gap-y-1">
                    <dt className="font-mono text-sm text-ink">{variable.token}</dt>
                    <dd className="text-sm text-ink-muted">{variable.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <Section label="How to use it">{body.howToUse}</Section>
          <Section label="Expected output">{body.expectedOutput}</Section>
          <Warning label="Common mistake">{body.commonMistake}</Warning>
        </div>
      );
    }

    case "framework": {
      const body = parsed.body;
      return (
        <div className="max-w-measure space-y-6">
          <Section label="Purpose">{body.purpose}</Section>
          {body.flow.length > 0 ? <FlowDiagram steps={body.flow} /> : null}
          <Section label="How it works">{body.explanation}</Section>

          <div className="space-y-3">
            <Label>The steps</Label>
            <ol className="space-y-3">
              {body.steps.map((step, index) => (
                <li key={step.label} className="flex gap-4">
                  <span className="label w-5 shrink-0 pt-1 text-ink-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-[0.9375rem] font-medium text-ink">{step.label}</span>
                    <span className="mt-0.5 block text-sm text-ink-muted">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <Section label="Example">{body.example}</Section>
          <Section label="When to use it">{body.whenToUse}</Section>
          <Warning label="Common mistake">{body.commonMistake}</Warning>
        </div>
      );
    }

    case "template": {
      const body = parsed.body;
      return (
        <div className="max-w-measure space-y-6">
          <Section label="How to use it">{body.instructions}</Section>

          <div className="space-y-3">
            <Label>Sections</Label>
            <ol className="space-y-3">
              {body.sections.map((section, index) => (
                <li key={section.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="label text-ink-subtle tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[0.9375rem] font-medium text-ink">{section.title}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-muted">{section.guidance}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>

          <CopyButton text={templateToText(body)} label="Copy template" />

          {body.example ? <Section label="Example">{body.example}</Section> : null}

          <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
            Filling this in is how a mission produces an artifact. Copy it into
            the mission&rsquo;s workspace and write there — the artifact is what
            gets submitted, not this page.
          </p>
        </div>
      );
    }

    case "checklist": {
      const body = parsed.body;
      return (
        <div className="max-w-measure space-y-6">
          <Section label="Before you start">{body.intro}</Section>
          <ChecklistControl itemId={itemId} body={body} checkedIds={checkedIds} path={path} />
        </div>
      );
    }

    case "resource": {
      const body = parsed.body;
      const range =
        body.startSeconds !== undefined
          ? `${formatTime(body.startSeconds)}${body.endSeconds !== undefined ? `–${formatTime(body.endSeconds)}` : ""}`
          : null;

      return (
        <div className="max-w-measure space-y-6">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="label text-ink-subtle">{body.resourceKind}</span>
            {body.source ? <span className="label text-ink-subtle">{body.source}</span> : null}
            {body.durationSeconds ? (
              <span className="label text-ink-subtle tabular-nums">
                {Math.round(body.durationSeconds / 60)} min
              </span>
            ) : null}
            {range ? <span className="label text-accent tabular-nums">Watch {range}</span> : null}
          </div>

          <Section label="Why this is here">{body.why}</Section>

          <p>
            <a
              href={body.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.9375rem] break-all text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
            >
              {body.url}
            </a>
          </p>

          <p className="border-l-2 border-border py-1 pl-4 text-sm text-ink-subtle">
            External material supplements a lesson and never carries it. If this
            link dies, the lesson it belongs to still teaches.
          </p>
        </div>
      );
    }

    case "stack_tool": {
      const body = parsed.body;
      return (
        <div className="max-w-measure space-y-6">
          <Section label="What it is">{body.what}</Section>
          <Section label="Why LOCK uses it">{body.why}</Section>
          <Section label="When to use it">{body.whenToUse}</Section>

          {body.alternatives.length > 0 ? (
            <div className="space-y-2">
              <Label>Alternatives</Label>
              <ul className="space-y-1.5">
                {body.alternatives.map((alternative) => (
                  <li key={alternative} className="flex gap-3 text-[0.9375rem] text-ink-muted">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-border-strong" />
                    <span>{alternative}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-sm text-ink-subtle">
                Knowing one tool is not choosing it.
              </p>
            </div>
          ) : null}

          <Warning label="Common mistake">{body.commonMistake}</Warning>

          {body.docsUrl ? (
            <p>
              <Link
                href={body.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
              >
                Documentation
              </Link>
            </p>
          ) : null}
        </div>
      );
    }

    default: {
      const exhaustive: never = parsed;
      void exhaustive;
      return null;
    }
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <Label as="h2">{label}</Label>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{children}</p>
    </section>
  );
}

function Warning({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-card border-l-2 border-danger/50 bg-surface-sunken py-4 pr-4 pl-5">
      <p className="label mb-2 text-danger">{label}</p>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{children}</p>
    </aside>
  );
}

/**
 * A framework's shape, as a chain.
 *
 * Text and borders rather than a drawn graphic: it reads on a 320px screen,
 * survives a theme change, is selectable, and a screen reader gets the sequence
 * as an ordered list. A decorative diagram would do none of those.
 */
function FlowDiagram({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="The sequence">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span className="label rounded-full border border-border-strong px-3 py-1.5 text-ink">
            {step}
          </span>
          {index < steps.length - 1 ? (
            <span aria-hidden className="text-ink-subtle">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** A template as plain text, so it can be pasted into a mission workspace. */
function templateToText(body: { sections: { title: string; guidance: string }[] }): string {
  return body.sections
    .map((section) => `## ${section.title}\n\n(${section.guidance})\n`)
    .join("\n");
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
