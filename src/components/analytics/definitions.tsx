/**
 * What the numbers on this page actually mean.
 *
 * A `<details>` rather than a tooltip or a modal: it is one element, it works
 * without JavaScript, it is findable by search-in-page, and somebody who
 * already knows what CTR is never has to close it.
 *
 * Every definition here is deliberately conservative. An analytics page that
 * overstates its precision is worse than one that admits its limits, because a
 * creator will make real decisions on these numbers.
 */
export function Definitions({ visitorsAvailable }: { visitorsAvailable: boolean }) {
  return (
    <details className="rounded-card border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink marker:text-ink-subtle">
        What do these numbers mean?
      </summary>

      <dl className="space-y-3 border-t border-border px-4 py-3.5 text-[0.8125rem] leading-relaxed">
        <Definition term="Views">
          Page-view events recorded for the selected period. A view is counted
          when a browser loads your page and runs a small script, so obvious
          crawlers and link-preview fetchers are not counted — and neither is a
          visitor whose browser blocks the request. The number is a slight
          undercount rather than an estimate upward.
        </Definition>

        <Definition term="Clicks">
          Link-click events. Every link on your page goes through ShowMe before
          it reaches its destination, so a click is counted even when the
          visitor leaves immediately.
        </Definition>

        <Definition term="CTR">
          Clicks divided by views, for the selected period. It can exceed 100%:
          one visitor following three links is three clicks on one view.
        </Definition>

        <Definition term="Unique visitors">
          {visitorsAvailable ? (
            <>
              An estimate, not a count of people. Visits are grouped by a hash
              that changes every day and is different for every page, so we
              cannot follow anybody between days or across creators — and never
              store an address. Two people sharing a connection count as one;
              one person on wifi and then on mobile data counts as two.
            </>
          ) : (
            <>Not available on this deployment.</>
          )}
        </Definition>

        <Definition term="Traffic source">
          Where a visitor came from, taken from the referrer their browser sent
          and reduced to a name. Missing referrers are shown as Direct, which
          also covers links opened from an app, a message or a bookmark.
        </Definition>

        <Definition term="Share of clicks">
          A link&rsquo;s clicks as a percentage of all clicks. This is not the
          same as its click-through rate, which compares its clicks to your
          page views — both are shown, and they are labelled separately.
        </Definition>
      </dl>
    </details>
  );
}

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-ink">{term}</dt>
      <dd className="mt-0.5 text-ink-muted">{children}</dd>
    </div>
  );
}
