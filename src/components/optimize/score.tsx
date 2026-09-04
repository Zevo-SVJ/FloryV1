import { Chevron } from "@/components/optimize/recommendation-card";
import { cn } from "@/lib/utils/cn";
import type { OptimizationScore, Verdict } from "@/lib/optimize/score";

/**
 * The score, and the arithmetic behind it on the same screen.
 *
 * The whole design brief for this component is one sentence: a number nobody
 * can explain is worse than no number. So the checks are not hidden behind a
 * tooltip or a help article — they are a list under the figure, each with its
 * weight, its verdict and the sentence that produced it. A creator who
 * disagrees with the 78 can see which line they disagree with.
 *
 * The ring is drawn with two SVG circles and no library. It carries no
 * information the number does not, which is why it is quiet and small and why
 * it is `aria-hidden`: the figure beside it is the content.
 */

const VERDICT_DOT: Record<Verdict, string> = {
  good: "bg-success",
  fair: "bg-warning",
  poor: "bg-danger",
};

const VERDICT_WORD: Record<Verdict, string> = {
  good: "Good",
  fair: "Could be better",
  poor: "Needs attention",
};

export function ScorePanel({ score, note }: { score: OptimizationScore; note: string }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-4 sm:gap-5">
        {score.value === null ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Optimization score</p>
            <p className="mt-1.5 text-[1.75rem] leading-none font-semibold tracking-[-0.02em] text-ink-subtle">
              Not enough data yet
            </p>
            {score.blockedBy ? (
              <p className="mt-2 text-[0.8125rem] text-ink-muted">
                A score needs {score.blockedBy.needed.toLocaleString()} {score.blockedBy.what} in
                the period. You have {score.blockedBy.have.toLocaleString()}.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <Ring value={score.value} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Optimization score</p>
              <p className="mt-1 text-[2rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {score.value}
                <span className="text-[1rem] font-normal text-ink-subtle"> / 100</span>
              </p>
              <p className="mt-2 text-[0.8125rem] text-ink-muted">{note}</p>
            </div>
          </>
        )}
      </div>

      {score.checks.length > 0 ? (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-0.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink">
            <Chevron className="h-3.5 w-3.5" />
            How this is worked out
          </summary>

          <ul className="mt-3 space-y-2.5">
            {score.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", VERDICT_DOT[check.verdict])}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[0.8125rem] font-medium text-ink">{check.label}</span>
                    <span className="text-[0.75rem] tabular-nums text-ink-subtle">
                      {round(check.earned)} of {check.weight}
                    </span>
                    <span className="sr-only">— {VERDICT_WORD[check.verdict]}.</span>
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-muted">
                    {check.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {score.pending.length > 0 ? (
            <>
              <p className="mt-4 text-[0.75rem] font-medium text-ink-subtle">
                Not scored yet — these need more data, so they are left out of the total rather
                than counted as zero.
              </p>
              <ul className="mt-1.5 space-y-1">
                {score.pending.map((item) => (
                  <li key={item.label} className="text-[0.8125rem] text-ink-subtle">
                    {item.label} — waiting for {item.waitingFor}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}

const round = (value: number) => (Number.isInteger(value) ? value : Math.round(value * 10) / 10);

/**
 * A ring, and nothing more.
 *
 * `pathLength="100"` lets the dash array be the percentage directly, which
 * saves computing a circumference and saves the next person reading this from
 * checking the arithmetic.
 */
function Ring({ value }: { value: number }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className="h-16 w-16 shrink-0 -rotate-90">
      <circle
        cx="20"
        cy="20"
        r="17"
        fill="none"
        strokeWidth="4"
        className="stroke-surface-sunken"
      />
      <circle
        cx="20"
        cy="20"
        r="17"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${value} 100`}
        className={cn(
          value >= 75 ? "stroke-success" : value >= 50 ? "stroke-warning" : "stroke-danger",
        )}
      />
    </svg>
  );
}
