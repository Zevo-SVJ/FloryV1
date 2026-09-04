import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/analytics/bars";
import { ButtonLink } from "@/components/ui/button";
import { History } from "@/components/optimize/history";
import { RecommendationCard } from "@/components/optimize/recommendation-card";
import { ScorePanel } from "@/components/optimize/score";
import { getOptimizationReport } from "@/lib/optimize/queries";
import { asksForAChange, whatIsMissing } from "@/lib/optimize/engine";
import { MIN_CLICKS, MIN_LINK_CLICKS, MIN_VIEWS } from "@/lib/optimize/thresholds";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Smart Optimization",
  // Private, like every route in this shell. An optimization score is a
  // statement about a creator's performance and belongs to nobody else.
  robots: { index: false, follow: false },
};

/**
 * What should I do about it.
 *
 * Analytics answers "what happened". This page answers the next question, and
 * the division is the point: nothing here is a second rendering of the
 * numbers. Every figure on this page comes from the same aggregates the
 * analytics page reads, over one fixed thirty-day window, and appears only
 * where it is the reason for a recommendation.
 *
 * A Server Component, rendered per request, like the analytics page and for
 * the same reason: a creator who has just applied a recommendation expects the
 * page to reflect it, and a five-minute cache would make the one moment
 * somebody is watching feel broken. None of this runs anywhere near a public
 * page — Smart Optimization is a dashboard route and nothing else in the
 * product imports it.
 *
 * Three states, and the first two are the ones that matter for honesty. A page
 * nobody has visited gets no score, no insight and no invented number. A page
 * with some traffic but not enough says which threshold it has not reached and
 * how far off it is. Only the third shows recommendations.
 */
export default async function OptimizePage() {
  const [profile, report] = await Promise.all([requireClaimedProfile(), getOptimizationReport()]);

  const address = `${siteUrl().replace(/^https?:\/\//, "")}/${profile.username}`;
  const { state, score, recommendations, dismissed, opportunities, metrics, history } = report;

  /*
   * Actionable first, in the order the engine ranked them, then the ones that
   * are only information. `asksForAChange` is the same predicate the
   * opportunity count uses, so the heading and the number can never disagree.
   */
  const actionable = recommendations.filter(asksForAChange);
  const observations = recommendations.filter((item) => !asksForAChange(item));
  const [strongest, ...others] = actionable;

  const working = [...metrics.links]
    .filter((link) => link.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return (
    <div className="max-w-3xl space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-title">Smart Optimization</h1>
          <Link
            href={`/${profile.username}`}
            className="rounded py-1 font-mono text-[0.8125rem] text-ink-subtle transition-colors hover:text-ink"
          >
            {address}
          </Link>
        </div>
        <p className="text-sm text-ink-muted">
          What your own numbers suggest you change. Everything here is measured over the{" "}
          {metrics.window.label}, and every recommendation shows the figures behind it.
        </p>
      </header>

      {state === "empty" ? <NothingYet address={address} /> : null}

      {state !== "empty" ? (
        <ScorePanel
          score={score}
          note={
            opportunities === 0
              ? recommendations.length === 0
                ? "Nothing to change right now."
                : `${recommendations.length} thing${recommendations.length === 1 ? "" : "s"} worth knowing.`
              : `${opportunities} opportunit${opportunities === 1 ? "y" : "ies"} to look at.`
          }
        />
      ) : null}

      {state === "learning" ? <Learning missing={whatIsMissing(metrics)} /> : null}

      {/*
        * Three groups, and the split is the point.
        *
        * A flat list of nine cards is a wall, and a creator scanning it has no
        * way to tell the one thing worth doing this afternoon from the fact
        * that their views are up. So the first actionable recommendation gets
        * its own heading, the rest of the actionable ones follow, and the
        * things that are only worth knowing are last and clearly labelled as
        * such. The ranking already put them in this order — this only names
        * the boundaries the ranking created.
        */}
      {strongest ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink">Your strongest opportunity</h2>
          <RecommendationCard key={strongest.key} recommendation={strongest} />
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink">
            {strongest ? "Other opportunities" : "Opportunities"}
          </h2>
          <div className="space-y-3">
            {others.map((recommendation) => (
              <RecommendationCard key={recommendation.key} recommendation={recommendation} />
            ))}
          </div>
        </section>
      ) : null}

      {observations.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink">Also worth knowing</h2>
          <p className="text-[0.8125rem] text-ink-muted">
            Nothing to do about these — they are what your numbers currently show.
          </p>
          <div className="space-y-3">
            {observations.map((recommendation) => (
              <RecommendationCard key={recommendation.key} recommendation={recommendation} />
            ))}
          </div>
        </section>
      ) : null}

      {state === "ready" && recommendations.length === 0 ? (
        <Panel title="No recommendations">
          <p className="py-4 text-[0.8125rem] leading-relaxed text-ink-muted">
            Nothing in your numbers suggests a change right now. Your best link is near the top,
            your profile is filled in, and nothing on the page has gone stale. This will update as
            more people visit.
          </p>
        </Panel>
      ) : null}

      {working.length > 0 ? (
        <Panel title="What's working" note={metrics.window.label}>
          <ul className="divide-y divide-border">
            {working.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {/*
                  * A link a visitor cannot see has no position, so it gets a
                  * dash rather than a "#0" — which is what it showed before,
                  * and which reads as a rank rather than as an absence.
                  */}
                <span className="w-8 shrink-0 text-[0.75rem] tabular-nums text-ink-subtle">
                  {link.visible ? `#${link.position}` : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">
                  {link.title}
                  {link.isFeatured ? (
                    <span className="ml-2 text-[0.6875rem] text-ink-subtle">Featured</span>
                  ) : null}
                  {link.expired ? (
                    <span className="ml-2 text-[0.6875rem] text-ink-subtle">Expired</span>
                  ) : null}
                  {link.scheduled ? (
                    <span className="ml-2 text-[0.6875rem] text-ink-subtle">Scheduled</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.875rem] font-medium tabular-nums text-ink">
                    {link.clicks.toLocaleString()}
                  </span>
                  <span className="block text-[0.75rem] tabular-nums text-ink-subtle">
                    {link.share}% of clicks
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {dismissed.length > 0 ? (
        <Panel title="Dismissed" note={`${dismissed.length} hidden`}>
          <ul className="space-y-1.5">
            {dismissed.map((item) => (
              <li key={item.key} className="text-[0.8125rem] text-ink-subtle">
                {item.title}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.75rem] text-ink-subtle">
            These still apply — you asked not to be shown them. Bring one back from the history
            below.
          </p>
        </Panel>
      ) : null}

      <Panel title="What you've changed" note="Newest first">
        <History events={history} />
      </Panel>

      <HowThisWorks />
    </div>
  );
}

/* ── Before there is anything to say ──────────────────────────────────────── */

/**
 * A page nobody has visited.
 *
 * Deliberately contains no number, no chart and no example insight with
 * plausible figures in it. What it does say is what kinds of thing will appear
 * and what has to happen first, because "come back later" is not useful and a
 * mocked-up recommendation would be a lie printed in the product.
 */
function NothingYet({ address }: { address: string }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-[0.9375rem] font-semibold text-ink">
        We&rsquo;re learning how your audience uses your page
      </h2>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
        Nobody has visited <span className="font-mono">{address}</span> yet, so there is nothing to
        read from. Once people start arriving and clicking, this page will show what is working and
        what to change — based on your own numbers, never on guesses.
      </p>

      <p className="mt-4 text-[0.75rem] font-medium text-ink-subtle">What will appear here</p>
      <ul className="mt-1.5 space-y-1 text-[0.8125rem] text-ink-muted">
        <li>Which of your links people actually click, and whether they are in the right order</li>
        <li>Whether your best link is near the top of the page</li>
        <li>How your page performs on phones against desktops</li>
        <li>Where your visitors are arriving from</li>
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href="/dashboard" size="sm">
          Share your page
        </ButtonLink>
        <ButtonLink href="/dashboard/analytics" size="sm" variant="secondary">
          View analytics
        </ButtonLink>
      </div>
    </section>
  );
}

/** Some traffic, not enough of it, and the exact distance to enough. */
function Learning({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-[0.9375rem] font-semibold text-ink">Still gathering data</h2>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
        Your page has visitors, but not yet enough for a claim about them to be worth acting on.
        Anything shown below is what the numbers already support.
      </p>
      <ul className="mt-3 space-y-1">
        {missing.map((item) => (
          <li key={item} className="text-[0.8125rem] tabular-nums text-ink-subtle">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── The thresholds, in the open ──────────────────────────────────────────── */

/**
 * The numbers this feature refuses to speak below, printed in the product.
 *
 * A creator who sees "Early signal" on a card should be able to find out what
 * that means without reading the source, and a creator who sees nothing at all
 * should be able to find out why.
 */
function HowThisWorks() {
  return (
    <details className="group rounded-card border border-border bg-surface p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-0.5">
        <span className="text-sm font-medium text-ink">How these recommendations are made</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div className="mt-3 space-y-3 text-[0.8125rem] leading-relaxed text-ink-muted">
        <p>
          Every recommendation is a rule applied to your own analytics — the same views and clicks
          the analytics page shows, over the last 30 days. There is no model, no prediction and
          nothing learned from other people&rsquo;s pages.
        </p>
        <p>
          A rule stays quiet until there is enough data for its answer to mean something. Traffic
          claims need {MIN_VIEWS} views, comparisons between links need {MIN_CLICKS} clicks across
          the page, and a claim about one particular link needs {MIN_LINK_CLICKS} clicks on that
          link. Below those, you will see &ldquo;not enough data yet&rdquo; rather than a guess.
        </p>
        <p>
          <strong className="font-medium text-ink">Early signal</strong> means the data has just
          cleared that bar; <strong className="font-medium text-ink">medium</strong> and{" "}
          <strong className="font-medium text-ink">high confidence</strong> mean several times more
          than the minimum.
        </p>
        <p>
          Nothing changes your page unless you press the button and confirm it, and everything that
          does can be undone.
        </p>
      </div>
    </details>
  );
}
