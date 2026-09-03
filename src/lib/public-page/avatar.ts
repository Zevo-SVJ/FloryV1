/**
 * The letter shown when a creator has no avatar.
 *
 * All that is left of this module. The host restriction moved to
 * `lib/media/url.ts` in Phase 4, when the avatar stopped being the only image
 * a creator could put on a page, and the two aliases kept here for the
 * transition were removed in Phase 8 once nothing imported them.
 *
 * `Array.from` rather than `charAt`, so an emoji or an accented character is
 * one glyph and not half of a surrogate pair.
 */
export function avatarInitial(displayName: string | null, username: string): string {
  const source = displayName?.trim() || username;
  return (Array.from(source)[0] ?? "?").toUpperCase();
}
