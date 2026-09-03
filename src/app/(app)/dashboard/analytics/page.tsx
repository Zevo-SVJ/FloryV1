import type { Metadata } from "next";
import Link from "next/link";
import { requireClaimedProfile } from "@/lib/auth/dal";
import { Bars, Panel } from "@/components/analytics/bars";
import { Chart } from "@/components/analytics/chart";
import { Definitions } from "@/components/analytics/definitions";
import { RangePicker } from "@/components/analytics/range-picker";
import { Stat } from "@/components/analytics/stat";
import {
  getBreakdown,
  getOverview,
  getRecent,
  getSeries,
  getTopLinks,
} from "@/lib/analytics/queries";
import { DEFAULT_RANGE, RANGE_LABELS, isRangeId, resolveWindow } from "@/lib/analytics/ranges";
import { countryFlag } from "@/lib/analytics/countries";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Analytics",
  // Private, like every route in this shell. `robots.txt` disallows /dashboard
  // as well; this is the half that holds if somebody links straight to it.
  robots: { index: false, follow: false },
};

/**
 * How a creator's page is doing.
 *
 * A Server Component, rendered per request. The range comes from the URL, so
 * there is no client state to keep in step with the numbers and every figure
 * on the page describes the same window by construction.
 *
 * Freshness over caching, deliberately. Every query is an aggregate over one
 * creator's rows inside an indexed time range, which is cheap, and a creator
 * who shares their link and refreshes expects to see the number move. Caching
 * this for five minutes would save little and would make the page feel broken
 * in the one moment somebody is actually watching it. If that trade changes,
 * the place to change it is here — nothing downstream assumes either way.
 *
 * Nothing on this page is invented. Where there is not enough data for a
 * comparison it says so; where a breakdown is empty it says that instead of
 * drawing an empty chart.
 */

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { range: requested } = await searchParams;
  const range = isRangeId(requested) ? requested : DEFAULT_RANGE;

  const profile = await requireClaimedProfile();

  /*
   * In parallel: six independent aggregates that share nothing but the window.
   * Awaiting them in sequence would make the page as slow as their sum for no
   * reason. `cache()` on each means the overview is computed once even though
   * `getTopLinks` also needs it for the click-through rate.
   */
  const [overview, series, links, sources, devices, countries, recent] = await Promise.all([
    getOverview(range),
    getSeries(range),
    getTopLinks(range),
    getBreakdown(range, "source"),
    getBreakdown(range, "device"),
    getBreakdown(range, "country"),
    getRecent(6),
  ]);

  const window = resolveWindow(range, new Date(), new Date(profile.created_at));
  const nothingYet = overview.views === 0 && overview.clicks === 0;
  const address = `${siteUrl().replace(/^https?:\/\//, "")}/${profile.username}`;

  return (
    <div className="max-w-3xl space-y-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-title">Analytics</h1>
          <Link
            href={`/${profile.username}`}
            className="rounded font-mono text-[0.8125rem] text-ink-subtle transition-colors hover:text-ink"
          >
            {address}
          </Link>
        </div>
        <RangePicker active={range} />
      </header>

      {nothingYet ? (
        <NoDataYet address={address} range={RANGE_LABELS[range]} />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Views"
          value={format(overview.views)}
          change={overview.change.views}
          comparable={overview.comparable}
        />
        <Stat
          label="Clicks"
          value={format(overview.clicks)}
          change={overview.change.clicks}
          comparable={overview.comparable}
        />
        <Stat
          label="CTR"
          value={overview.ctr === null ? "—" : `${overview.ctr}%`}
          change={overview.change.ctr}
          comparable={overview.comparable}
        />
        <Stat
          label="Visitors"
          value={overview.visitors === null ? "—" : format(overview.visitors)}
          hint={overview.visitors === null ? "Not available here" : "Estimated"}
        />
      </div>

      <Panel title="Over time" note={RANGE_LABELS[range]}>
        <Chart series={series} bucket={window.bucket} />
      </Panel>

      <Panel
        title="Links"
        note={links.length > 0 ? "Share of clicks · CTR" : undefined}
      >
        <LinkTable links={links} />
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Traffic sources">
          <Bars rows={sources} empty="No views recorded in this period." />
        </Panel>

        <Panel title="Devices">
          <Bars rows={devices} empty="No views recorded in this period." />
        </Panel>
      </div>

      <Panel title="Countries">
        <Bars
          rows={countries.map((row) => ({ ...row, icon: countryFlag(row.key) }))}
          empty="Country data unavailable for this period."
        />
      </Panel>

      {recent.length > 0 ? (
        <Panel title="Recent activity" note="Newest first">
          <Recent events={recent} />
        </Panel>
      ) : null}

      <Definitions visitorsAvailable={overview.visitors !== null} />
    </div>
  );
}

const format = (value: number) => value.toLocaleString();

/* ── Links ────────────────────────────────────────────────────────────────── */

/**
 * Link performance, as a list rather than a table.
 *
 * A four-column table at 320px is a horizontal scrollbar, and this is a page
 * creators open on a phone. Each row is a block: title, then the two numbers
 * beneath it with their own labels, so nothing depends on a header row that
 * has scrolled out of view.
 *
 * Share of clicks and CTR are labelled separately and never abbreviated to one
 * number. They answer different questions — "which of my links do people
 * pick" and "how often does my page produce a click" — and conflating them is
 * the most common way a link-in-bio dashboard misleads somebody.
 */
function LinkTable({
  links,
}: {
  links: { id: string | null; title: string; clicks: number; share: number; ctr: number | null; deleted: boolean }[];
}) {
  if (links.length === 0) {
    return (
      <p className="py-6 text-center text-[0.8125rem] text-ink-subtle">
        No clicks recorded in this period.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {links.map((link, index) => (
        <li
          key={link.id ?? `deleted-${index}`}
          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <span className="w-4 shrink-0 text-[0.75rem] tabular-nums text-ink-subtle">
            {index + 1}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] text-ink">{link.title}</span>
            {link.deleted ? (
              <span className="block text-[0.75rem] text-ink-subtle">
                Deleted — its clicks are kept
              </span>
            ) : null}
          </span>

          <span className="shrink-0 text-right">
            <span className="block text-[0.875rem] font-medium tabular-nums text-ink">
              {format(link.clicks)}
            </span>
            <span className="block text-[0.75rem] tabular-nums text-ink-subtle">
              {link.share}% of clicks
              {link.ctr === null ? "" : ` · ${link.ctr}% CTR`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Recent ───────────────────────────────────────────────────────────────── */

function Recent({ events }: { events: { kind: "view" | "click"; title: string | null; at: Date }[] }) {
  return (
    <ul className="space-y-2">
      {events.map((event, index) => (
        <li
          key={`${event.at.toISOString()}-${index}`}
          className="flex items-baseline gap-3 text-[0.8125rem]"
        >
          <span className="min-w-0 flex-1 truncate text-ink">
            {event.kind === "click" ? `Click — ${event.title ?? "a link"}` : "Page view"}
          </span>
          <time
            dateTime={event.at.toISOString()}
            className="shrink-0 text-[0.75rem] text-ink-subtle"
          >
            {relative(event.at)}
          </time>
        </li>
      ))}
    </ul>
  );
}

/**
 * "8 min ago", from a timestamp.
 *
 * Rounded to the minute and no finer. A recent-activity list is the one place
 * this page comes close to describing individuals, and a second-precise time
 * beside an event is a great deal more identifying than a coarse one — so it
 * is coarse, and the list carries no device, country or source at all.
 */
function relative(at: Date): string {
  const minutes = Math.max(0, Math.round((Date.now() - at.getTime()) / 60_000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  return `${Math.round(hours / 24)} d ago`;
}

/* ── Empty ────────────────────────────────────────────────────────────────── */

/**
 * A page with nothing on it yet.
 *
 * Placed above the numbers rather than instead of them: the zeroes below are
 * true and worth seeing, and replacing the whole dashboard with an
 * illustration would hide the range picker somebody just used. This says why
 * it is empty and what to do about it, and gets out of the way.
 */
function NoDataYet({ address, range }: { address: string; range: string }) {
  return (
    <div className="rounded-card border border-border bg-surface-sunken px-4 py-4">
      <p className="text-[0.875rem] font-medium text-ink">No data for {range.toLowerCase()} yet</p>
      <p className="mt-1 max-w-[52ch] text-[0.8125rem] leading-relaxed text-ink-muted">
        Share <span className="font-mono text-ink">{address}</span> and views will
        appear here. Analytics start the moment somebody opens your page — there
        is nothing to switch on.
      </p>
    </div>
  );
}
