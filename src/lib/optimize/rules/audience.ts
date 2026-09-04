import {
  MIN_DEVICE_VIEWS,
  MIN_TREND_VIEWS,
  MIN_VIEWS,
  confidenceFor,
  weakest,
} from "@/lib/optimize/thresholds";
import { analyticsAction, evidence, windowEvidence } from "@/lib/optimize/rules/shared";
import { percentChange } from "@/lib/analytics/ranges";
import { DIRECT } from "@/lib/analytics/sources";
import type { Rule } from "@/lib/optimize/types";

/**
 * What can honestly be said about an audience from aggregate counts.
 *
 * The limits here are as much a part of the feature as the output, so they are
 * written down rather than discovered later:
 *
 * **There is no per-source click-through rate, and there will not be one from
 * this data.** A page view records where the visitor came from, because the
 * beacon sends `document.referrer`. A click is recorded by `/go/<id>`, whose
 * referrer is the creator's own page — which `normalizeSource` correctly
 * resolves to `direct`. So clicks are effectively all `direct`, and dividing
 * clicks-by-source into views-by-source would produce a table of numbers that
 * look like rates and are arithmetic on a mismatch. Reporting "Instagram
 * visitors convert at 4%" from that would be exactly the fabrication this
 * phase is written against. Closing the gap would mean joining a click back to
 * the view that produced it, which means an identifier that survives across
 * two requests — precisely the tracking this product decided in Phase 6 not to
 * do.
 *
 * **Device is different, and that is why device gets the comparison.** Both
 * tables derive `device` from the user agent of their own request, so a click
 * on a phone is recorded as a click on a phone. Views by device and clicks by
 * device are the same measurement on the same population, and dividing one by
 * the other is a real rate.
 */

const at = (metrics: { at: Date }) => metrics.at.toISOString();

/* ── Clicking, by device ──────────────────────────────────────────────────── */

/**
 * When the device most of a creator's visitors use is also the device they
 * click least on, that is worth knowing — and it is a description, not a
 * diagnosis. The copy says which is higher and by how much, and stops there:
 * why a phone converts worse than a desktop is a question about the page, the
 * audience and the destination, and this data answers none of it.
 */
export const deviceCtrGap: Rule = {
  type: "DEVICE_CTR_GAP",
  run(metrics) {
    if (metrics.views < MIN_VIEWS) return [];

    const measurable = metrics.devices
      .filter((row) => row.device !== "unknown")
      .filter((row) => row.views >= MIN_DEVICE_VIEWS && row.ctr !== null);
    if (measurable.length < 2) return [];

    /*
     * The busiest device against the best-converting one — not the worst
     * against the best.
     *
     * The first version compared the extremes, and a tablet with eighty views
     * and no clicks was always the extreme: it made itself the subject of
     * every comparison and then failed the rule's own "is this the device
     * that matters" test, so the rule never fired on a real page. What a
     * creator needs to know is whether the device most of their visitors use
     * is doing worse than another, which is this.
     */
    const busiest = [...measurable].sort((a, b) => b.views - a.views)[0];
    const strongest = [...measurable].sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))[0];
    if (!busiest || !strongest || busiest.device === strongest.device) return [];

    const high = strongest.ctr ?? 0;
    const low = busiest.ctr ?? 0;
    // Written as a comparison rather than a ratio so that a busiest device
    // with no clicks at all is reportable rather than a division by zero.
    if (high < low * 1.4) return [];

    const weakestDevice = busiest;

    const a = confidenceFor(strongest.views, MIN_DEVICE_VIEWS);
    const b = confidenceFor(weakestDevice.views, MIN_DEVICE_VIEWS);
    if (!a || !b) return [];

    return [
      {
        key: `DEVICE_CTR_GAP:${weakestDevice.device}`,
        type: "DEVICE_CTR_GAP",
        title: `${weakestDevice.label} visitors click less often`,
        explanation:
          `${weakestDevice.label} is where most of your traffic comes from — ` +
          `${weakestDevice.views.toLocaleString()} views — and ${low}% of those visits produced a ` +
          `click, against ${high}% on ${strongest.label.toLowerCase()}. Your page is mostly read on ` +
          `${weakestDevice.label.toLowerCase()}, so what a visitor sees before scrolling matters most there.`,
        priority: "medium",
        confidence: weakest(a, b),
        evidence: [
          evidence(`${weakestDevice.label} views`, weakestDevice.views.toLocaleString()),
          evidence(`${weakestDevice.label} click-through`, `${low}%`),
          evidence(`${strongest.label} views`, strongest.views.toLocaleString()),
          evidence(`${strongest.label} click-through`, `${high}%`),
          windowEvidence(metrics),
        ],
        secondary: [analyticsAction()],
        evaluatedAt: at(metrics),
      },
    ];
  },
};

/* ── Where the traffic comes from ─────────────────────────────────────────── */

/**
 * One number, said plainly, with no story attached to it.
 *
 * The `direct` case is handled separately and not as a source at all, because
 * it is not one: it means no referrer arrived, which is what happens when a
 * link is opened from inside an app, from a QR code, or from a browser
 * configured not to send one. Presenting that as "Direct is your biggest
 * channel" would be reading an absence as a fact.
 */
export const sourceConcentration: Rule = {
  type: "SOURCE_CONCENTRATION",
  run(metrics) {
    if (metrics.views < MIN_VIEWS) return [];

    const top = [...metrics.sources].sort((a, b) => b.views - a.views)[0];
    if (!top || top.share < 50) return [];

    const confidence = confidenceFor(metrics.views, MIN_VIEWS);
    if (!confidence) return [];

    const unattributed = top.key === DIRECT;

    return [
      {
        key: `SOURCE_CONCENTRATION:${top.key}`,
        type: "SOURCE_CONCENTRATION",
        title: unattributed
          ? "Most visits arrive without a referrer"
          : `${top.label} sends most of your visitors`,
        explanation: unattributed
          ? `${top.share}% of your views arrive with no referrer, so there is nothing to attribute ` +
            "them to. That is normal for a link opened inside an app, scanned from a QR code, or " +
            "typed in — it is missing information rather than a channel."
          : `${top.share}% of your views in this period came from ${top.label} ` +
            `(${top.views.toLocaleString()} of ${metrics.views.toLocaleString()}). Worth knowing when ` +
            "you decide where to post your link next.",
        priority: "low",
        confidence,
        evidence: [
          evidence(unattributed ? "Unattributed views" : `${top.label} views`, top.views.toLocaleString()),
          evidence("Share of all views", `${top.share}%`),
          evidence("Views in this period", metrics.views.toLocaleString()),
          windowEvidence(metrics),
        ],
        secondary: [analyticsAction()],
        evaluatedAt: at(metrics),
      },
    ];
  },
};

/* ── Up or down ───────────────────────────────────────────────────────────── */

/**
 * A comparison between two windows of the same length, both of which have to
 * clear a higher bar than any other rule uses.
 *
 * The reason for the higher bar is that this output is a percentage, and a
 * percentage is read as more precise than it is: "up 34%" from 50 views to 67
 * is four afternoons of ordinary variation wearing a decimal point. It also
 * says nothing about what comes next — there is no forecast here, and there
 * will not be one until there is a method behind it.
 */
export const trafficTrend: Rule = {
  type: "TRAFFIC_TREND",
  run(metrics) {
    const previous = metrics.previous;
    if (!previous) return [];
    if (metrics.views < MIN_TREND_VIEWS || previous.views < MIN_TREND_VIEWS) return [];

    const change = percentChange(metrics.views, previous.views);
    if (change === null || Math.abs(change) < 20) return [];

    const confidence = confidenceFor(Math.min(metrics.views, previous.views), MIN_TREND_VIEWS);
    if (!confidence) return [];

    const rising = change > 0;
    const clickChange = percentChange(metrics.clicks, previous.clicks);

    return [
      {
        key: `TRAFFIC_TREND:${rising ? "up" : "down"}`,
        type: "TRAFFIC_TREND",
        title: rising ? "Your views are up" : "Your views are down",
        explanation:
          `${metrics.views.toLocaleString()} views in the ${metrics.window.label.toLowerCase()}, against ` +
          `${previous.views.toLocaleString()} in the ${metrics.window.days} days before that — ` +
          `${rising ? "up" : "down"} ${Math.abs(change)}%.` +
          (clickChange === null
            ? ""
            : ` Clicks ${clickChange === 0 ? "held steady" : clickChange > 0 ? `rose ${clickChange}%` : `fell ${Math.abs(clickChange)}%`}.`),
        priority: "low",
        confidence,
        evidence: [
          evidence("This period", `${metrics.views.toLocaleString()} views`),
          evidence("Previous period", `${previous.views.toLocaleString()} views`),
          evidence("Change", `${rising ? "+" : ""}${change}%`),
          evidence("Periods compared", `${metrics.window.days} days each`),
        ],
        secondary: [analyticsAction()],
        evaluatedAt: at(metrics),
      },
    ];
  },
};
