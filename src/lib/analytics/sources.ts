import type { EventDimensions } from "@/lib/analytics/types";

/**
 * Turning a referrer into a thing a creator recognises.
 *
 * A creator wants to know that Instagram sends half their traffic. They do not
 * want `https://l.instagram.com/?u=https%3A%2F%2Fshowme.at%2F8zevo&e=AT0…`,
 * which is what the browser actually sends — and which carries a query string
 * that is nobody's business and occasionally somebody's identity.
 *
 * So the full referrer is never stored. It is reduced here to one identifier
 * from the table below, plus (only when nothing matched) the bare hostname, so
 * that "Other" can be broken down without keeping a URL.
 *
 * Adding a source is one entry in `SOURCES`. Matching is on the registrable
 * part of the hostname, so `l.instagram.com`, `www.instagram.com` and
 * `instagram.com` are all Instagram without three rules.
 */

interface Source {
  id: string;
  label: string;
  /** Hostnames, matched as themselves or as a suffix after a dot. */
  hosts: readonly string[];
}

const SOURCES: readonly Source[] = [
  { id: "instagram", label: "Instagram", hosts: ["instagram.com", "ig.me", "instagr.am"] },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com", "vt.tiktok.com", "vm.tiktok.com"] },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be", "m.youtube.com"] },
  { id: "x", label: "X", hosts: ["x.com", "twitter.com", "t.co"] },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me", "m.facebook.com"] },
  { id: "google", label: "Google", hosts: ["google.com", "google.co.uk", "news.google.com"] },
  { id: "linkedin", label: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"] },
  { id: "reddit", label: "Reddit", hosts: ["reddit.com", "redd.it"] },
  { id: "pinterest", label: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
  { id: "snapchat", label: "Snapchat", hosts: ["snapchat.com"] },
  { id: "telegram", label: "Telegram", hosts: ["telegram.org", "t.me", "telegram.me"] },
  { id: "whatsapp", label: "WhatsApp", hosts: ["whatsapp.com", "wa.me"] },
  { id: "discord", label: "Discord", hosts: ["discord.com", "discord.gg"] },
  { id: "twitch", label: "Twitch", hosts: ["twitch.tv"] },
  { id: "threads", label: "Threads", hosts: ["threads.net", "threads.com"] },
  { id: "bing", label: "Bing", hosts: ["bing.com"] },
  { id: "duckduckgo", label: "DuckDuckGo", hosts: ["duckduckgo.com"] },
];

/** The two sources that are not a website. */
export const DIRECT = "direct";
export const OTHER = "other";

const LABELS = new Map<string, string>([
  [DIRECT, "Direct"],
  [OTHER, "Other"],
  ...SOURCES.map((source) => [source.id, source.label] as [string, string]),
]);

/**
 * What to call a source in the dashboard.
 *
 * A source stored before an entry was removed, or by a newer version of the
 * app, falls back to the identifier itself rather than to nothing — a row
 * reading `mastodon` is more use than a blank one.
 */
export function sourceLabel(id: string): string {
  return LABELS.get(id) ?? id.charAt(0).toUpperCase() + id.slice(1);
}

const hostMatches = (host: string, candidate: string): boolean =>
  host === candidate || host.endsWith(`.${candidate}`);

/**
 * A referrer, reduced to a source and at most a hostname.
 *
 * `selfHost` is our own origin: a visitor arriving at a link from the ShowMe
 * page they were already on is not a traffic source, and counting it as one
 * would make "Direct" mean two different things. It becomes `direct`, which is
 * the honest answer to "where did this visit come from" when the answer is
 * "from inside".
 */
export function normalizeSource(
  referrer: string | null | undefined,
  selfHost: string | null,
): Pick<EventDimensions, "source" | "referrerHost"> {
  const value = referrer?.trim();
  if (!value) return { source: DIRECT, referrerHost: null };

  let host: string;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { source: DIRECT, referrerHost: null };
    }
    host = url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { source: DIRECT, referrerHost: null };
  }

  if (host.length === 0) return { source: DIRECT, referrerHost: null };
  if (selfHost && hostMatches(host, selfHost)) return { source: DIRECT, referrerHost: null };

  const matched = SOURCES.find((source) =>
    source.hosts.some((candidate) => hostMatches(host, candidate)),
  );
  if (matched) return { source: matched.id, referrerHost: null };

  // Unrecognised: the bucket is `other`, and the host — and only the host — is
  // kept so a creator can see what "other" actually was.
  return { source: OTHER, referrerHost: host.slice(0, 255) };
}
