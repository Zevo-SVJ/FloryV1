import { mediaHost, renderableMediaUrl } from "@/lib/media/url";

/**
 * The avatar, and the letter that stands in for it.
 *
 * The host restriction moved to `lib/media/url.ts` in Phase 4, when the avatar
 * stopped being the only image a creator could put on a page. These two names
 * are kept because they say what the caller means, and because a rename across
 * the renderer would have bought nothing.
 */

export const avatarHost = mediaHost;
export const renderableAvatarUrl = renderableMediaUrl;

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
