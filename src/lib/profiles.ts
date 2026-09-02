import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Link, Profile, SocialLink } from "@/types/database";

/**
 * Reading a public page.
 *
 * Separate from the data access layer because nothing here depends on who is
 * asking: these queries run for anonymous visitors and are governed entirely by
 * the "readable by anyone" policies. Row Level Security does the filtering, so
 * this code never has to remember to exclude somebody else's rows.
 *
 * Note there is no `is_active` filter in the queries below. There does not need
 * to be — the policy already restricts an anonymous reader to active rows. A
 * signed-in creator viewing their own page sees their drafts too, which is the
 * behaviour we want and comes for free.
 */

export interface PublicPage {
  profile: Profile;
  links: Link[];
  socials: SocialLink[];
}

/** The profile behind a username, or null when nobody has claimed it. */
export const getProfileByUsername = cache(
  async (username: string): Promise<Profile | null> => {
    if (!isSupabaseConfigured()) return null;

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },
);

/**
 * Everything the public page renders, in one pass.
 *
 * Three queries rather than one nested select: they are all indexed on
 * `profile_id`, they are independent, and keeping them flat means the page can
 * later stream the link list separately from the header without restructuring
 * the fetch.
 */
export const getPublicPage = cache(async (username: string): Promise<PublicPage | null> => {
  const profile = await getProfileByUsername(username);
  if (!profile) return null;

  try {
    const supabase = await createClient();
    const [links, socials] = await Promise.all([
      supabase
        .from("links")
        .select("*")
        .eq("profile_id", profile.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("social_links")
        .select("*")
        .eq("profile_id", profile.id)
        .order("position", { ascending: true }),
    ]);

    return {
      profile,
      links: links.data ?? [],
      socials: socials.data ?? [],
    };
  } catch {
    // The profile resolved but its content did not. Rendering the header alone
    // beats a 500 on a page somebody linked from a bio.
    return { profile, links: [], socials: [] };
  }
});
