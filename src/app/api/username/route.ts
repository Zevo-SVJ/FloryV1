import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/usernames/availability";

/**
 * GET /api/username?u=alex
 *
 * Answers the signup form while somebody is typing. A GET because that is what
 * it is — a read, cancellable by the browser when the next keystroke arrives.
 *
 * This tells an anonymous caller whether a username exists, which is not a
 * leak: `showme.at/alex` already answers the same question by resolving or
 * returning 404, and profiles are world-readable so the public page can render.
 * What it must not do is leak anything else, so a database failure comes back
 * as "cannot check right now" rather than as a Postgres error.
 */

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("u") ?? "";

  // Bounded before any work happens: an unbounded parameter is an invitation.
  if (requested.length > 120) {
    return NextResponse.json(
      { username: "", state: "invalid", message: "That username is too long." },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const availability = await checkAvailability(requested);

  return NextResponse.json(availability, {
    // A name that is free now may not be in a second; caching this would show
    // one person's answer to the next.
    headers: { "cache-control": "no-store" },
  });
}
