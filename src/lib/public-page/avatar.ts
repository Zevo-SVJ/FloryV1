import { supabaseEnv } from "@/lib/env";
import { checkUrl } from "@/lib/validation/url";

/**
 * Which avatar URLs this deployment is willing to load.
 *
 * `avatar_url` is a column a creator will eventually control, and an image tag
 * pointed at an arbitrary host is a request this server or its image optimizer
 * makes on a stranger's behalf. That is worth being narrow about: only images
 * from this project's own Supabase Storage are rendered, and anything else
 * falls back to initials rather than being fetched.
 *
 * The same host list is given to `next/image` in `next.config.ts`, and it has
 * to be — the optimizer refuses a host it was not configured with, and a
 * mismatch would be a runtime error on a public page rather than a fallback.
 *
 * Phase 4's uploader writes into that bucket, so the restriction costs nothing
 * a creator would notice.
 */

/** The host Supabase Storage serves from, or null when unconfigured. */
export function avatarHost(): string | null {
  const env = supabaseEnv();
  if (!env) return null;

  try {
    return new URL(env.url).hostname;
  } catch {
    return null;
  }
}

/**
 * The avatar, if it is one we will actually load.
 *
 * Returns null for a missing, malformed, non-https or foreign-hosted value,
 * and the caller renders initials instead. Never throws: a bad string in one
 * column must not take down a page.
 */
export function renderableAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (checkUrl(value) !== null) return null;

  const host = avatarHost();
  if (!host) return null;

  try {
    const parsed = new URL(value);
    // `https` only: an http image on an https page is blocked as mixed content
    // anyway, and would show as a broken avatar rather than a clean fallback.
    if (parsed.protocol !== "https:") return null;
    return parsed.hostname === host ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * The letter shown when there is no avatar.
 *
 * Taken from the display name, then the username. `Array.from` rather than
 * `charAt`, so an emoji or an accented character is one glyph and not half of
 * a surrogate pair.
 */
export function avatarInitial(displayName: string | null, username: string): string {
  const source = displayName?.trim() || username;
  return (Array.from(source)[0] ?? "?").toUpperCase();
}
