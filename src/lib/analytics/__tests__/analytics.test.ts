import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeSource, sourceLabel, DIRECT, OTHER } from "../sources.ts";
import { detectDevice } from "../device.ts";
import { isBot } from "../bots.ts";
import {
  clickThroughRate,
  percentChange,
  resolveWindow,
  isRangeId,
  RANGES,
} from "../ranges.ts";
import { countryFlag, countryName } from "../countries.ts";

/**
 * The parts of analytics that can be wrong without a database being involved.
 *
 * Two themes run through this file. The first is that no number is ever
 * invented: a comparison with nothing to compare against is null, a rate with
 * no denominator is null, and the dashboard says so rather than showing a
 * confident zero. The second is that nothing a visitor's browser sends is
 * stored as it arrived — a referrer becomes one identifier from a fixed list,
 * and a user agent becomes one of four words.
 */

const SELF = "showme.at";

/* ── Traffic sources ──────────────────────────────────────────────────────── */

test("a referrer becomes a source, and never a URL", () => {
  const cases: [string, string][] = [
    ["https://www.instagram.com/", "instagram"],
    ["https://l.instagram.com/?u=https%3A%2F%2Fshowme.at%2F8zevo&e=AT0x", "instagram"],
    ["https://vt.tiktok.com/ZS123/", "tiktok"],
    ["https://m.youtube.com/watch?v=abc", "youtube"],
    ["https://t.co/abcdef", "x"],
    ["https://twitter.com/someone/status/1", "x"],
    ["https://www.google.com/search?q=zevo", "google"],
    ["https://t.me/channel", "telegram"],
    ["https://old.reddit.com/r/x", "reddit"],
  ];

  for (const [referrer, expected] of cases) {
    const result = normalizeSource(referrer, SELF);
    assert.equal(result.source, expected, referrer);
    // A recognised source keeps no hostname at all.
    assert.equal(result.referrerHost, null, referrer);
  }
});

test("an unrecognised referrer keeps its host and nothing else", () => {
  const result = normalizeSource("https://blog.example.com/posts/1?utm=x#top", SELF);

  assert.equal(result.source, OTHER);
  assert.equal(result.referrerHost, "blog.example.com");
});

test("no path, query string or fragment ever survives normalization", () => {
  const nosy = "https://mail.example.com/inbox/user@example.com?token=secret#thread";
  const result = normalizeSource(nosy, SELF);

  assert.equal(result.referrerHost, "mail.example.com");
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.equal(JSON.stringify(result).includes("user@example.com"), false);
});

test("a missing or unusable referrer is Direct", () => {
  for (const value of [null, undefined, "", "   ", "not a url", "android-app://com.x", "javascript:alert(1)"]) {
    assert.equal(normalizeSource(value, SELF).source, DIRECT, String(value));
  }
});

test("our own page is not a traffic source", () => {
  assert.equal(normalizeSource("https://showme.at/8zevo", SELF).source, DIRECT);
  assert.equal(normalizeSource("https://www.showme.at/8zevo", SELF).source, DIRECT);
  // A different host that merely ends in ours is somebody else.
  assert.equal(normalizeSource("https://notshowme.at/x", SELF).source, OTHER);
});

test("a lookalike hostname is not the real one", () => {
  assert.equal(normalizeSource("https://instagram.com.evil.example/x", SELF).source, OTHER);
  assert.equal(normalizeSource("https://fake-tiktok.com/x", SELF).source, OTHER);
});

test("every source has a label a person would recognise", () => {
  assert.equal(sourceLabel("instagram"), "Instagram");
  assert.equal(sourceLabel("x"), "X");
  assert.equal(sourceLabel(DIRECT), "Direct");
  assert.equal(sourceLabel(OTHER), "Other");
  // A source stored by a newer version still renders as something.
  assert.equal(sourceLabel("mastodon"), "Mastodon");
});

/* ── Devices ──────────────────────────────────────────────────────────────── */

test("a phone, a tablet and a computer are told apart", () => {
  const phone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const android =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
  const ipad =
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1";
  const androidTablet =
    "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
  const mac =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
  const windows =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

  assert.equal(detectDevice(phone), "mobile");
  assert.equal(detectDevice(android), "mobile");
  assert.equal(detectDevice(ipad), "tablet");
  // Android without a "Mobile" token is the tablet convention.
  assert.equal(detectDevice(androidTablet), "tablet");
  assert.equal(detectDevice(mac), "desktop");
  assert.equal(detectDevice(windows), "desktop");
});

test("an absent or unreadable user agent is Unknown, not a guess", () => {
  assert.equal(detectDevice(null), "unknown");
  assert.equal(detectDevice(""), "unknown");
  assert.equal(detectDevice("   "), "unknown");
  assert.equal(detectDevice("something nobody has seen"), "unknown");
});

/* ── Bots ─────────────────────────────────────────────────────────────────── */

test("the crawlers that matter most are recognised", () => {
  const bots = [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Twitterbot/1.0",
    "Slackbot-LinkExpanding 1.0",
    "Mozilla/5.0 (compatible; Discordbot/2.0)",
    "TelegramBot (like TwitterBot)",
    "WhatsApp/2.23",
    "LinkedInBot/1.0",
    "Mozilla/5.0 (compatible; bingbot/2.0)",
    "curl/8.4.0",
    "python-requests/2.31.0",
    "Go-http-client/2.0",
    "node-fetch/1.0",
    "Mozilla/5.0 HeadlessChrome/120",
  ];

  for (const ua of bots) assert.equal(isBot(ua), true, ua);
});

test("a real browser is not a bot", () => {
  const humans = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    // Instagram's in-app browser, which is a person and must not be filtered.
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 302.0.0.23.113 (iPhone14,3; iOS 17_0)",
  ];

  for (const ua of humans) assert.equal(isBot(ua), false, ua);
});

test("a request with no user agent is treated as a bot", () => {
  // Every real browser sends one. The requests that do not are scripts, and
  // counting them is how an empty table fills with nothing.
  assert.equal(isBot(null), true);
  assert.equal(isBot(""), true);
});

/* ── Windows and comparisons ──────────────────────────────────────────────── */

const NOW = new Date("2026-06-15T12:00:00.000Z");
const OLD_ACCOUNT = new Date("2025-01-01T00:00:00.000Z");

test("every range id is recognised and nothing else is", () => {
  for (const range of RANGES) assert.equal(isRangeId(range), true, range);
  assert.equal(isRangeId("1y"), false);
  assert.equal(isRangeId(undefined), false);
  assert.equal(isRangeId("'; drop table page_views;--"), false);
});

test("a range resolves to a half-open window with a sensible bucket", () => {
  const week = resolveWindow("7d", NOW, OLD_ACCOUNT);

  assert.equal(week.to.getTime(), NOW.getTime());
  assert.equal(week.bucket, "day");
  assert.equal((week.to.getTime() - week.from.getTime()) / 86_400_000, 7);

  assert.equal(resolveWindow("today", NOW, OLD_ACCOUNT).bucket, "hour");
  assert.equal(resolveWindow("90d", NOW, OLD_ACCOUNT).bucket, "day");
});

test("the previous period is the same length, immediately before", () => {
  const week = resolveWindow("7d", NOW, OLD_ACCOUNT);

  assert.ok(week.previous);
  assert.equal(week.previous.to.getTime(), week.from.getTime());
  assert.equal(
    week.previous.to.getTime() - week.previous.from.getTime(),
    week.to.getTime() - week.from.getTime(),
  );
});

test("an account too young to have a previous period gets no comparison", () => {
  const threeDaysOld = new Date(NOW.getTime() - 3 * 86_400_000);

  assert.equal(resolveWindow("7d", NOW, threeDaysOld).previous, null);
  assert.equal(resolveWindow("30d", NOW, threeDaysOld).previous, null);
  // Long enough to have one.
  assert.notEqual(resolveWindow("today", NOW, threeDaysOld).previous, null);
});

test("all time has no previous period and reaches back further than any account", () => {
  const all = resolveWindow("all", NOW, OLD_ACCOUNT);

  assert.equal(all.previous, null);
  assert.equal(all.bucket, "day");
  /*
   * Deliberately the epoch and not the account's creation instant.
   *
   * Starting at `since` was tried while fixing the four-second All-time tab,
   * and it was wrong twice over: the slowness was in the query's shape rather
   * than the window's width, and any page whose events predate its profile
   * row — a backfill, a restore, a seeded fixture — reported zero views with
   * no indication anything had been excluded.
   */
  assert.equal(all.from.getTime(), 0);
  assert.ok(all.from.getTime() < OLD_ACCOUNT.getTime());
});

test("a percentage is null wherever it would be invented", () => {
  // Nothing to compare against.
  assert.equal(percentChange(10, null), null);
  // A rise from zero is not a percentage.
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(0, 0), null);

  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(80, 100), -20);
  assert.equal(percentChange(100, 100), 0);
});

test("CTR is clicks over views, and null when there were no views", () => {
  assert.equal(clickThroughRate(0, 0), null);
  assert.equal(clickThroughRate(5, 0), null);
  assert.equal(clickThroughRate(0, 10), 0);
  assert.equal(clickThroughRate(342, 1284), 26.6);
  // Above 100% is real: one visitor can follow several links.
  assert.equal(clickThroughRate(30, 10), 300);
});

/* ── Countries ────────────────────────────────────────────────────────────── */

test("a country code becomes a name and a flag", () => {
  assert.equal(countryName("FR"), "France");
  assert.equal(countryName("GB"), "United Kingdom");
  assert.equal(countryFlag("FR"), "🇫🇷");
});

test("an unknown country is named, not blank", () => {
  assert.equal(countryName("ZZ"), "Unknown");
  assert.equal(countryFlag("ZZ"), "🌍");
  assert.equal(countryFlag("nonsense"), "🌍");
});
