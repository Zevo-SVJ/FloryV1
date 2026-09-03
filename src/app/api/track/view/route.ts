import { after } from "next/server";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import { isBot } from "@/lib/analytics/bots";
import { allow, requestKey } from "@/lib/analytics/rate-limit";
import { recordPageView } from "@/lib/analytics/record";
import { usernameFromPath } from "@/lib/validation/username";

/**
 * Where a page view is recorded.
 *
 * The public page is cached for a minute, so a view cannot be counted while it
 * renders — a cached hit never runs the render, and the second visitor would be
 * invisible. It is counted instead by a few hundred bytes of script in the
 * visitor's browser, which posts here once the page is on screen.
 *
 * Three things fall out of that, and all three are why it is worth the script:
 *
 *   · The referrer is the real one. `document.referrer` is where the visitor
 *     actually came from; the `Referer` header on this request would say the
 *     creator's own page, which is not a traffic source.
 *
 *   · Most crawlers disappear. Link preview fetchers read the HTML for an Open
 *     Graph tag and leave without running anything, so they never arrive here
 *     at all. The user-agent list is the second layer, not the first.
 *
 *   · The page never waits. This is a separate request that happens after
 *     paint, and if it fails nothing about the page changes.
 *
 * The cost, stated honestly: a visitor with JavaScript disabled or an ad
 * blocker that recognises the path is not counted. That undercounts, which is
 * the right direction to be wrong in — a creator deciding what to post based
 * on inflated numbers is worse off than one working from conservative ones.
 */

/*
 * Never prerendered and never cached: this route exists for its side effect,
 * and reads headers to produce it.
 */
export const dynamic = "force-dynamic";

/**
 * The whole payload.
 *
 * A username and a referrer, and nothing else — no profile id, no counts, no
 * dimensions. Everything that ends up in a row is either derived from a header
 * on the server or resolved from the username against the database, so there
 * is no field an attacker can choose the value of.
 */
const payloadSchema = z.object({
  u: z.string().trim().min(1).max(64),
  // The browser's own value. Capped and validated, and normalized to a source
  // identifier before it reaches the database.
  r: z.string().trim().max(2048).optional(),
});

/** Generous for a person, tight for a script: a view every few seconds. */
const LIMIT = 20;
const WINDOW_MS = 60_000;

export async function POST(request: Request): Promise<Response> {
  // 204 for every outcome below. This endpoint reports nothing to its caller:
  // whether a name exists, whether it was rate limited and whether the write
  // succeeded are all things a visitor has no business learning, and a body
  // would be one more thing to send on a request that exists to be cheap.
  const noContent = new Response(null, { status: 204 });

  if (!isSupabaseConfigured()) return noContent;

  const headers = request.headers;
  if (isBot(headers.get("user-agent"))) return noContent;
  if (!allow(requestKey(headers, "view"), LIMIT, WINDOW_MS)) return noContent;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noContent;
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return noContent;

  /*
   * The username is normalized through the same function the public route
   * uses, so `/8Zevo` and `/8zevo` are one page here as they are there. A name
   * that is not in canonical form is not looked up — the page it names would
   * have redirected rather than rendered, so a view for it is not a real view.
   */
  const resolved = usernameFromPath(parsed.data.u);
  if (resolved.kind !== "canonical") return noContent;

  /*
   * Resolved server-side, with the session-less public client. The browser
   * sends a username; the profile id it maps to is ours to determine, which is
   * the difference between an event that can be attributed and one that can be
   * forged onto any creator.
   */
  let profileId: string | null = null;
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", resolved.username)
      .maybeSingle();

    profileId = data?.id ?? null;
  } catch {
    return noContent;
  }

  if (!profileId) return noContent;

  /*
   * `after` runs the insert once the response has gone out, so the browser is
   * never waiting on a database write for a request it does not read.
   */
  const owner = profileId;
  after(() => recordPageView(owner, headers, parsed.data.r ?? null));

  return noContent;
}
