import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Block } from "@/lib/learning/blocks";

/**
 * The blocks that only present.
 *
 * The rule that governs all of them: **a block should look like the thing it
 * is**. Text looks like text. A quote looks like a quote. A warning feels like
 * a warning. Code sits in a well. Nothing gets a rectangle drawn around it for
 * being a block — that was the previous system's failure, and it made a lesson
 * read as a stack of identical containers with no idea which of them mattered.
 *
 * The second constraint: a lesson is read, so the column stays at the reading
 * measure and nothing widens it. The exceptions are deliberate and each one
 * scrolls inside itself rather than pushing the page — code, tables and
 * comparisons are the three that genuinely cannot be reflowed.
 */

type Of<K extends Block["kind"]> = Extract<Block, { kind: K }>;

export function HeadingBlock({ block }: { block: Of<"heading"> }) {
  /* The lesson title is the page's h1. A block that emitted another would give
     the document two, which breaks how a screen reader outlines the page. */
  const Tag = block.level === 2 ? "h2" : "h3";
  return (
    <Tag
      id={block.id}
      className={cn(
        "scroll-mt-24 text-ink",
        block.level === 2 ? "pt-5 text-title2" : "pt-3 text-title3",
      )}
    >
      {block.text}
    </Tag>
  );
}

/** Text, looking like text. No container, no rule, no tint. */
export function TextBlock({ block }: { block: Of<"text"> }) {
  return <p className="text-body leading-[1.7] text-ink-muted">{block.text}</p>;
}

const CALLOUT_LABEL: Record<Of<"callout">["tone"], string> = {
  note: "Note",
  tip: "Tip",
  warning: "Careful",
  why: "Why this matters",
  real_world: "Real world",
};

const CALLOUT_ICON: Record<Of<"callout">["tone"], IconName> = {
  note: "note",
  tip: "sparkle",
  warning: "lock",
  why: "target",
  real_world: "build",
};

/**
 * A callout, and the home of the two the brief singles out.
 *
 * "Why this matters" and "Real world" are tones rather than separate block
 * types: they differ from a note by a label and an accent, and three components
 * that are one component with different words drift apart.
 */
export function CalloutBlock({ block }: { block: Of<"callout"> }) {
  const emphasised = block.tone === "why" || block.tone === "real_world";
  const warning = block.tone === "warning";

  return (
    <aside
      className={cn(
        "flex gap-3.5 rounded-card px-4 py-3.5",
        warning
          ? "bg-danger/[0.07]"
          : emphasised
            ? "bg-accent-quiet/70"
            : "bg-ink/[0.035]",
      )}
    >
      <Icon
        name={CALLOUT_ICON[block.tone]}
        className={cn(
          "mt-0.5 size-[1.15rem] shrink-0",
          warning ? "text-danger" : emphasised ? "text-accent" : "text-ink-subtle",
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-footnote font-semibold tracking-[0.01em] uppercase",
            warning ? "text-danger" : emphasised ? "text-accent" : "text-ink-subtle",
          )}
        >
          {block.title ?? CALLOUT_LABEL[block.tone]}
        </p>
        <p className="mt-1.5 text-subhead leading-relaxed text-ink-muted">{block.text}</p>
      </div>
    </aside>
  );
}

/**
 * A quote, looking like a quote.
 *
 * Set larger than the surrounding prose rather than indented behind a rule.
 * Somebody said this and it is worth stopping for; size is how a page says that,
 * and a left border is how a page says "here is another container".
 */
export function QuoteBlock({ block }: { block: Of<"quote"> }) {
  return (
    <figure className="py-2">
      <blockquote className="text-title3 leading-relaxed font-normal text-ink">
        <span aria-hidden className="text-ink-subtle">&ldquo;</span>
        {block.text}
        <span aria-hidden className="text-ink-subtle">&rdquo;</span>
      </blockquote>
      {block.attribution ? (
        <figcaption className="mt-2.5 text-footnote text-ink-subtle">
          {block.attribution}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * An image, treated as teaching material.
 *
 * `alt` is required by the schema, so there is no branch here for its absence.
 * A screenshot gets a frame and a diagram does not — a screenshot is a picture
 * of another interface and needs an edge to stop it reading as part of ours.
 *
 * `unoptimized`, and it stays that way on purpose rather than pending a
 * decision. Turning it off routes every image through Next's optimizer, which
 * fetches the URL *server-side* — an open optimizer on arbitrary content URLs
 * is a request-forgery vector and a bandwidth bill. Rendering the URL directly
 * in the browser has neither problem. The schema requires https, and the CSP
 * bounds `img-src` to https.
 *
 * Once the curriculum settles on a handful of image hosts, adding those to
 * `images.remotePatterns` and dropping this flag is a safe, local change.
 */
export function ImageBlock({ block }: { block: Of<"image"> }) {
  return (
    <figure className="space-y-2">
      <div
        className={cn(
          "overflow-hidden rounded-card",
          block.variant === "screenshot" && "bg-surface-sunken ring-1 ring-ink/[0.06]",
        )}
      >
        <Image
          src={block.src}
          alt={block.alt}
          width={1200}
          height={800}
          unoptimized
          className="h-auto w-full"
        />
      </div>
      {block.caption ? (
        <figcaption className="text-footnote text-ink-subtle">{block.caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function CodeBlock({ block }: { block: Of<"code"> }) {
  return (
    <div className="overflow-hidden rounded-card bg-surface-sunken">
      <p className="truncate px-4 pt-3 font-mono text-caption text-ink-subtle">
        {block.filename ?? block.language}
      </p>
      {/* Scrolls inside itself. A long line must never widen the page. */}
      <pre className="overflow-x-auto px-4 pt-2 pb-4">
        <code className="font-mono text-[0.8125rem] leading-relaxed text-ink">{block.code}</code>
      </pre>
    </div>
  );
}

export function TerminalBlock({ block }: { block: Of<"terminal"> }) {
  return (
    <div className="overflow-hidden rounded-card bg-surface-sunken">
      <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">
        <code>
          <span className="text-ink-subtle select-none">$ </span>
          <span className="text-ink">{block.command}</span>
          {block.output ? <span className="block pt-2 text-ink-muted">{block.output}</span> : null}
        </code>
      </pre>
    </div>
  );
}

/** A reusable prompt, with the reason it is shaped the way it is. */
export function PromptBlock({ block }: { block: Of<"prompt"> }) {
  return (
    <div className="overflow-hidden rounded-card bg-surface-sunken">
      <div className="flex items-baseline gap-2.5 px-4 pt-3.5">
        <span className="text-caption font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          Prompt
        </span>
        <span className="min-w-0 flex-1 truncate text-subhead font-medium text-ink">
          {block.title}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-muted">
        {block.prompt}
      </pre>
      {block.why ? (
        <p className="px-4 pb-3.5 text-footnote text-ink-subtle">{block.why}</p>
      ) : null}
    </div>
  );
}

export function ChecklistBlock({ block }: { block: Of<"checklist"> }) {
  return (
    <div className="space-y-3 rounded-card bg-ink/[0.035] px-4 py-4">
      {block.title ? (
        <p className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          {block.title}
        </p>
      ) : null}
      <ul className="space-y-2.5">
        {block.items.map((item, index) => (
          <li key={index} className="flex items-start gap-3 text-subhead text-ink-muted">
            {/* An empty square, not an interactive checkbox: this is reference
                material, and a control that saves nothing is a broken promise. */}
            <span
              aria-hidden
              className="mt-1 size-[0.95rem] shrink-0 rounded-[5px] ring-1.5 ring-ink/20"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StepsBlock({ block }: { block: Of<"steps"> }) {
  return (
    <div className="space-y-3">
      {block.title ? (
        <p className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          {block.title}
        </p>
      ) : null}
      <ol className="space-y-3">
        {block.items.map((item, index) => (
          <li key={index} className="flex gap-3.5 text-body leading-relaxed text-ink-muted">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] font-mono text-caption tabular-nums text-ink-subtle">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ComparisonBlock({ block }: { block: Of<"comparison"> }) {
  return (
    <div className="space-y-3">
      {block.title ? (
        <p className="text-footnote font-semibold tracking-[0.01em] text-ink-subtle uppercase">
          {block.title}
        </p>
      ) : null}
      {/* One column on a phone. Two columns of three words each is not a
          comparison, it is two columns. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[block.left, block.right].map((side, index) => (
          <div key={index} className="rounded-card bg-ink/[0.035] px-4 py-3.5">
            <p className="text-subhead font-semibold text-ink">{side.label}</p>
            <ul className="mt-2.5 space-y-2">
              {side.points.map((point, i) => (
                <li key={i} className="flex gap-2.5 text-subhead text-ink-muted">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink/25" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableBlock({ block }: { block: Of<"table"> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink/15">
            {block.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="py-2.5 pr-4 text-footnote font-semibold text-ink-subtle"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index} className="border-b border-separator last:border-0">
              {row.map((cell, i) => (
                <td key={i} className="py-3 pr-4 text-subhead text-ink-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Native `<details>`: keyboard operable and searchable without any JavaScript. */
export function ExpandableBlock({ block }: { block: Of<"expandable"> }) {
  return (
    <details className="group overflow-hidden rounded-card bg-ink/[0.035]">
      <summary className="tactile flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-subhead font-medium text-ink marker:hidden hover:bg-ink/[0.03]">
        <Icon
          name="forward"
          className="size-4 shrink-0 text-ink-subtle transition-transform duration-[--duration-fast] group-open:rotate-90 motion-reduce:transition-none"
        />
        <span className="min-w-0 flex-1">{block.summary}</span>
      </summary>
      <p className="px-4 pb-4 pl-11 text-subhead leading-relaxed text-ink-muted">{block.text}</p>
    </details>
  );
}

/**
 * External video, as a link rather than an embed.
 *
 * Not an iframe, and that is a considered trade. An embed loads third-party
 * scripts and cookies into a page LOCK controls, needs a `frame-src` that has
 * to stay in step with a provider list, and does not survive the video being
 * taken down. A card with the reason attached does survive it — the lesson
 * still teaches, and the reader knows what they are missing.
 */
export function VideoBlock({ block }: { block: Of<"video"> }) {
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="tactile flex gap-4 rounded-card bg-ink/[0.035] px-4 py-3.5 hover:bg-ink/[0.055]"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-ink-inverse">
        <Icon name="play" className="size-4 translate-x-px" fill="currentColor" />
      </span>
      <span className="min-w-0">
        <span className="block text-subhead font-medium text-ink">{block.title}</span>
        <span className="mt-1 block text-subhead text-ink-muted">{block.why}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-footnote text-ink-subtle">
          <span>Video</span>
          {block.source ? <span>{block.source}</span> : null}
          {block.durationSeconds ? (
            <span className="font-mono tabular-nums">
              {Math.round(block.durationSeconds / 60)} min
            </span>
          ) : null}
        </span>
      </span>
    </a>
  );
}
