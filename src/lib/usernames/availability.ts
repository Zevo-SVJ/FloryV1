import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  checkUsername,
  normalizeUsername,
  usernameProblemMessage,
} from "@/lib/validation/username";

/**
 * Is this name free?
 *
 * Used by the signup form as the user types and again by the server action
 * that actually claims the name. Neither is the protection: between the check
 * and the claim, someone else can take it. The unique index on
 * `profiles.username` is what decides, and both callers are written to expect
 * that answer to arrive late. This exists to tell somebody early, not to
 * guarantee anything.
 */

export type AvailabilityState = "available" | "taken" | "reserved" | "invalid" | "unknown";

export interface Availability {
  /** The normalized form, so the caller can show what would actually be used. */
  username: string;
  state: AvailabilityState;
  /** A sentence for the person typing. Null when the name is available. */
  message: string | null;
}

export async function checkAvailability(input: string): Promise<Availability> {
  const username = normalizeUsername(input);

  const problem = checkUsername(username);
  if (problem) {
    return {
      username,
      state: problem === "reserved" ? "reserved" : "invalid",
      message: usernameProblemMessage(problem),
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      username,
      state: "unknown",
      message: "Cannot check right now.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      // Never surface a Postgres message to somebody choosing a username.
      return { username, state: "unknown", message: "Cannot check right now." };
    }

    return data
      ? { username, state: "taken", message: "That username is taken." }
      : { username, state: "available", message: null };
  } catch {
    return { username, state: "unknown", message: "Cannot check right now." };
  }
}
