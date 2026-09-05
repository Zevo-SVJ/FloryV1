import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { Block } from "@/lib/learning/blocks";

/**
 * The blocks that only present.
 *
 * All of them share one constraint: a lesson is read, so the measure stays at
 * `max-w-measure` (44rem, roughly 75 characters) and nothing widens it. The
 * exceptions are deliberate and each one scrolls inside itself rather than
 * pushing the page — code, tables and comparisons are the three that genuinely
 * cannot be reflowed.
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
        "scroll-mt-24 font-semibold text-ink",
        block.level === 2 ? "pt-4 text-[1.375rem] tracking-[-0.02em]" : "pt-2 text-[1.0625rem]",
      )}
    >
      {block.text}
    </Tag>
  );
}

export function TextBlock({ block }: { block: Of<"text"> }) {
  return <p className="text-[1.0625rem] leading-[1.7] text-ink-muted">{block.text}</p>;
}

const CALLOUT_LABEL: Record<Of<"callout">["tone"], string> = {
  note: "Note",
  tip: "Tip",
  warning: "Careful",
  why: "Why this matters",
  real_world: "Real world",
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

  return (
    <aside
      className={cn(
        "rounded-card border-l-2 py-4 pr-4 pl-5",
        emphasised ? "border-accent bg-accent-quiet/40" : "border-border-strong bg-surface-sunken",
      )}
    >
      <p className={cn("label mb-2", emphasised ? "text-accent" : "text-ink-subtle")}>
        {block.title ?? CALLOUT_LABEL[block.tone]}
      </p>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{block.text}</p>
    </aside>
  );
}

export function QuoteBlock({ block }: { block: Of<"quote"> }) {
  return (
    <figure className="border-l-2 border-border-strong pl-5">
      <blockquote className="text-[1.0625rem] leading-relaxed text-ink italic">
        {block.text}
      </blockquote>
      {block.attribution ? (
        <figcaption className="label mt-2 text-ink-subtle">{block.attribution}</figcaption>
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
          block.variant === "screenshot" && "border border-border bg-surface-sunken",
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
        <figcaption className="text-sm text-ink-subtle">{block.caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function CodeBlock({ block }: { block: Of<"code"> }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-sunken">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="label truncate text-ink-subtle">{block.filename ?? block.language}</span>
      </div>
      {/* Scrolls inside itself. A long line must never widen the page. */}
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-[0.8125rem] leading-relaxed text-ink">{block.code}</code>
      </pre>
    </div>
  );
}

export function TerminalBlock({ block }: { block: Of<"terminal"> }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-sunken">
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
    <div className="rounded-card border border-border">
      <div className="border-b border-border px-4 py-2.5">
        <p className="label text-ink-subtle">Prompt</p>
        <p className="mt-1 text-sm font-medium text-ink">{block.title}</p>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-muted">
        {block.prompt}
      </pre>
      {block.why ? (
        <p className="border-t border-border px-4 py-3 text-sm text-ink-subtle">{block.why}</p>
      ) : null}
    </div>
  );
}

export function ChecklistBlock({ block }: { block: Of<"checklist"> }) {
  return (
    <div className="space-y-3 rounded-card border border-border p-5">
      {block.title ? <p className="label text-ink-subtle">{block.title}</p> : null}
      <ul className="space-y-2">
        {block.items.map((item, index) => (
          <li key={index} className="flex items-baseline gap-3 text-[0.9375rem] text-ink-muted">
            {/* A square, not an interactive checkbox: this is reference
                material, and a control that saves nothing is a broken promise. */}
            <span aria-hidden className="mt-1 size-3 shrink-0 rounded-[3px] border border-border-strong" />
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
      {block.title ? <p className="label text-ink-subtle">{block.title}</p> : null}
      <ol className="space-y-3">
        {block.items.map((item, index) => (
          <li key={index} className="flex gap-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            <span className="label w-5 shrink-0 pt-1 text-ink-subtle tabular-nums">
              {String(index + 1).padStart(2, "0")}
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
      {block.title ? <p className="label text-ink-subtle">{block.title}</p> : null}
      {/* One column on a phone. Two columns of three words each is not a
          comparison, it is two columns. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[block.left, block.right].map((side, index) => (
          <div key={index} className="space-y-2 rounded-card border border-border p-4">
            <p className="text-sm font-medium text-ink">{side.label}</p>
            <ul className="space-y-1.5">
              {side.points.map((point, i) => (
                <li key={i} className="text-sm text-ink-muted">
                  {point}
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
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {block.columns.map((column) => (
              <th key={column} scope="col" className="label px-4 py-3 text-ink-subtle">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index} className="border-b border-border last:border-0">
              {row.map((cell, i) => (
                <td key={i} className="px-4 py-3 text-ink-muted">
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
    <details className="group rounded-card border border-border">
      <summary className="cursor-pointer list-none px-4 py-3 text-[0.9375rem] font-medium text-ink marker:hidden">
        <span className="label mr-2 text-ink-subtle group-open:hidden">Show</span>
        <span className="label mr-2 hidden text-ink-subtle group-open:inline">Hide</span>
        {block.summary}
      </summary>
      <p className="border-t border-border px-4 py-4 text-[0.9375rem] leading-relaxed text-ink-muted">
        {block.text}
      </p>
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
      className="block rounded-card border border-border p-5 transition-colors hover:border-border-strong hover:bg-surface-sunken"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label text-ink-subtle">Video</span>
        {block.source ? <span className="label text-ink-subtle">{block.source}</span> : null}
        {block.durationSeconds ? (
          <span className="label text-ink-subtle tabular-nums">
            {Math.round(block.durationSeconds / 60)} min
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[0.9375rem] font-medium text-ink underline decoration-border-strong underline-offset-4">
        {block.title}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        <span className="label mr-2 text-ink-subtle">Why watch this</span>
        {block.why}
      </p>
    </a>
  );
}
