import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { isBot } from "@/lib/analytics/bots";
import { allow, requestKey } from "@/lib/analytics/rate-limit";
import { recordLinkClick } from "@/lib/analytics/record";
import { checkUrl } from "@/lib/validation/url";

/**
 * Every link on a ShowMe page goes through here.
 *
 * The naive alternative — an ordinary `<a href="…">` with a beacon fired
 * alongside it — loses events, and loses them exactly when they matter. The
 * browser begins tearing the page down the instant a navigation starts, and a
 * request that has not left yet goes with it. On a slow phone, which is where
 * these pages are read, that is a large fraction of the clicks.
 *
 * So the click *is* the request. The visitor lands here, the destination is
 * looked up, the redirect goes out, and the row is written afterwards.
 *
 * The destination is never in the URL, and this is the security property that
 * matters most in this file. `/go/<id>` names a row; it does not carry a
 * place to go. There is no query parameter to override, so there is no open
 * redirect to find — `/go/<id>?url=https://phishing.example` is a request with
 * an ignored parameter. A creator's stored URL is the only thing that can ever
 * be redirected to, and it was validated when it was saved and is validated
 * again here.
 */

/*
 * Never cached. The whole point is to observe each visit, and a cached
 * redirect would be a redirect nobody sees.
 */
export const dynamic = "force-dynamic";

/** A person clicking links, not a script walking them. */
const LIMIT = 60;
const WINDOW_MS = 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where somebody goes when the link does not resolve. */
function home(): Response {
  return Response.redirect(siteUrl(), 302);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ linkId: string }> },
): Promise<Response> {
  const { linkId } = await params;

  // Checked before the database is touched: a malformed id is a request that
  // was never going to match a row, and rejecting it here keeps a scan for
  // valid uuids from being free.
  if (!UUID.test(linkId)) return home();
  if (!isSupabaseConfigured()) return home();

  const headers = request.headers;

  /*
   * The session-less public client, on purpose. Row Level Security shows it
   * only links whose `is_active` is true — so "the link exists and is
   * published" is one query rather than a query plus a check somebody could
   * later forget. A hidden link is indistinguishable from a deleted one, which
   * is the correct answer to a stranger asking.
   */
  let link: { id: string; profile_id: string; title: string; url: string } | null = null;
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("links")
      .select("id, profile_id, title, url")
      .eq("id", linkId)
      .maybeSingle();

    link = data;
  } catch {
    // The database is unreachable. There is nothing safe to redirect to.
    return home();
  }

  if (!link) return home();

  /*
   * Validated again, at the moment it becomes a redirect.
   *
   * A CHECK constraint on the column and `urlSchema` on the way in should both
   * have made a `javascript:` URL impossible. This is the last place the value
   * is still ours, and the cost of checking is one function call against the
   * cost of being wrong, which is redirecting somebody's audience somewhere
   * they should not go.
   */
  if (checkUrl(link.url) !== null) return home();

  /*
   * Recorded after the redirect is on its way, and only for what looks like a
   * person. A bot still gets redirected — refusing would break link checkers
   * and preview fetchers for no benefit — it simply is not counted.
   */
  if (!isBot(headers.get("user-agent")) && allow(requestKey(headers, "click"), LIMIT, WINDOW_MS)) {
    const click = { profileId: link.profile_id, linkId: link.id, linkTitle: link.title };
    /*
     * The `Referer` here is the creator's own page in the ordinary case, and
     * `normalizeSource` turns that into `direct` rather than into a
     * self-referencing traffic source. It is only meaningful when somebody has
     * shared a `/go/` URL directly, which happens rarely and is worth keeping
     * when it does. Traffic sources in the dashboard come from page views,
     * where the referrer is the real one.
     */
    after(() => recordLinkClick(click, headers, headers.get("referer")));
  }

  /*
   * 302, not 301. A permanent redirect is one browsers and intermediaries are
   * entitled to remember forever, and this URL is not permanent: a creator can
   * change where a link points, or unpublish it. A cached 301 would keep
   * sending an audience to an address its owner has retired, and would stop
   * the click being counted at all.
   */
  return Response.redirect(link.url, 302);
}
