import Image from "next/image";
import { avatarInitial } from "@/lib/public-page/avatar";
import type { PublicProfile } from "@/lib/public-page/types";

/**
 * Who this page belongs to.
 *
 * The first thing a visitor sees after tapping a link in a bio, so it answers
 * one question — whose page is this — and gets out of the way. Name, handle,
 * bio, in that order of weight.
 *
 * Two arrangements, chosen by the theme or the creator. `centered` is the
 * portrait-above-name shape most creator pages use; `compact` puts the avatar
 * beside the name in a row, which is what makes the Editorial theme read as a
 * masthead rather than a profile. Everything else about the header — sizes,
 * spacing, the avatar's diameter — is the stylesheet reading `data-sm-header`
 * and `data-sm-avatar`, so this component describes structure and never size.
 */
export function ProfileHeader({ profile }: { profile: PublicProfile }) {
  const name = profile.displayName ?? profile.username;

  return (
    <header className="sm-header">
      <Avatar profile={profile} name={name} />

      <div className="sm-header-text">
        <h1 className="sm-name">{name}</h1>

        {/*
         * The handle is shown only when it is not already the heading.
         * Repeating "alex" under "Alex" says nothing and costs a line.
         */}
        {profile.displayName ? <p className="sm-handle">@{profile.username}</p> : null}

        {profile.bio ? <p className="sm-bio">{profile.bio}</p> : null}
      </div>
    </header>
  );
}

/**
 * The avatar's rendered size is fixed here and its displayed size is not.
 *
 * `next/image` needs intrinsic dimensions to pick a source; the stylesheet
 * decides how large it actually appears. 320 covers the largest case (7.5rem)
 * at 2x without asking a phone to decode a 2000px original.
 */
const AVATAR_PX = 320;

function Avatar({ profile, name }: { profile: PublicProfile; name: string }) {
  if (profile.avatarUrl) {
    return (
      <Image
        src={profile.avatarUrl}
        alt={`${name}'s profile picture`}
        width={AVATAR_PX}
        height={AVATAR_PX}
        sizes="160px"
        // The one image above the fold on the page this product exists to
        // serve. It should not wait for anything.
        priority
        className="sm-avatar"
      />
    );
  }

  /*
   * The fallback is decorative, not informational: the name is in the heading
   * directly beside it, so a screen reader announcing a lone letter would only
   * be repeating a fragment of what it is about to read properly.
   */
  return (
    <div aria-hidden className="sm-avatar">
      <span className="sm-avatar-initial">
        {avatarInitial(profile.displayName, profile.username)}
      </span>
    </div>
  );
}
