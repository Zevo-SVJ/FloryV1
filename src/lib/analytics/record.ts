import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { detectDevice } from "@/lib/analytics/device";
import { normalizeSource } from "@/lib/analytics/sources";
import { visitorHash } from "@/lib/analytics/visitor";
import { siteUrl } from "@/lib/env";
import type { EventDimensions } from "@/lib/analytics/types";

/**
 * Writing an event, and never mattering if it fails.
 *
 * The rule this whole module is built around: a creator's page and a visitor's
 * click are the product, and analytics is a note taken about them. If the note
 * cannot be taken — no service key, database unreachable, a constraint we did
 * not anticipate — the page still renders and the redirect still happens.
 * Every function here swallows its own failure and returns void.
 *
 * The dimensions are derived from request headers on the server. Nothing the
 * client sends is written except `document.referrer`, which is a hint about
 * where a visit came from and is normalized to one of a fixed set of source
 * identifiers before it goes anywhere near the database.
 */

/**
 * The country headers a deployment might set, most trustworthy first.
 *
 * Infrastructure-provided, never computed here: a geolocation database is a
 * dependency, a licence and a monthly update, and the platforms that host this
 * already know the answer. When none of them is present the column stays null
 * and the dashboard says so rather than guessing.
 */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "fly-client-country",
] as const;

function detectCountry(headers: Headers): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    // Two letters, and not the placeholder Cloudflare sends for its own
    // health checks and for addresses it cannot place.
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1") {
      return value;
    }
  }
  return null;
}

/** Our own hostname, so a referrer from inside the page is not a source. */
function selfHost(): string | null {
  try {
    return new URL(siteUrl()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Everything an event records about a request.
 *
 * `referrer` is passed in rather than read from the `Referer` header because
 * the two mean different things: on a page view the beacon sends
 * `document.referrer`, which is where the visitor actually came from, while
 * the header on that same request would say the creator's own page.
 */
export function dimensionsFrom(headers: Headers, referrer: string | null): EventDimensions {
  return {
    ...normalizeSource(referrer, selfHost()),
    device: detectDevice(headers.get("user-agent")),
    country: detectCountry(headers),
  };
}

/**
 * Record that somebody looked at a creator's page.
 *
 * The profile id is resolved by the caller from a username; it is never a
 * value the browser supplied. `visitorHash` is computed here so the address it
 * reads never travels any further than this call.
 */
export async function recordPageView(
  profileId: string,
  headers: Headers,
  referrer: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  try {
    const dimensions = dimensionsFrom(headers, referrer);

    await supabase.from("page_views").insert({
      profile_id: profileId,
      source: dimensions.source,
      referrer_host: dimensions.referrerHost,
      device: dimensions.device,
      country: dimensions.country,
      visitor_hash: visitorHash(headers, profileId),
    });
  } catch {
    // Deliberately silent. This runs after the response has already been sent;
    // there is nobody to tell, and the alternative is an unhandled rejection
    // taking down a serverless invocation over a missed statistic.
  }
}

/**
 * Record that somebody followed a link.
 *
 * `linkTitle` is a snapshot. A click outlives the link it points at — the
 * editor deletes links routinely — and the snapshot is what keeps a year-old
 * number legible after the row is gone.
 */
export async function recordLinkClick(
  input: { profileId: string; linkId: string; linkTitle: string },
  headers: Headers,
  referrer: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  try {
    const dimensions = dimensionsFrom(headers, referrer);

    await supabase.from("link_clicks").insert({
      profile_id: input.profileId,
      link_id: input.linkId,
      link_title: input.linkTitle.slice(0, 80),
      source: dimensions.source,
      referrer_host: dimensions.referrerHost,
      device: dimensions.device,
      country: dimensions.country,
    });
  } catch {
    // Same reasoning, and more important here: a visitor is mid-navigation to
    // somebody else's website and must not be made to wait or fail for this.
  }
}
