import Image from "next/image";
import { avatarInitial } from "@/lib/public-page/avatar";
import type { PublicProfile } from "@/lib/public-page/types";

/**
 * Who this page belongs to.
 *
 * The first thing a visitor sees after tapping a link in a bio, so it answers
 * one question — whose page is this — and gets out of the way. Name, handle,
 * bio, in that order of weight.
 */
export function ProfileHeader({ profile }: { profile: PublicProfile }) {
  const name = profile.displayName ?? profile.username;

  return (
    <header className="flex flex-col items-center text-center">
      <Avatar profile={profile} name={name} />

      <h1 className="mt-5 text-[1.5rem] font-semibold tracking-[-0.02em] sm:text-[1.75rem]">
        {name}
      </h1>

      {/*
       * The handle is shown only when it is not already the heading. Repeating
       * "alex" under "Alex" says nothing and costs a line.
       */}
      {profile.displayName ? (
        <p className="mt-1 font-mono text-sm text-ink-subtle">@{profile.username}</p>
      ) : null}

      {profile.bio ? (
        <p className="mt-4 max-w-[34ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          {profile.bio}
        </p>
      ) : null}
    </header>
  );
}

const AVATAR_PX = 96;

function Avatar({ profile, name }: { profile: PublicProfile; name: string }) {
  if (profile.avatarUrl) {
    return (
      <Image
        src={profile.avatarUrl}
        alt={`${name}'s profile picture`}
        width={AVATAR_PX}
        height={AVATAR_PX}
        // The one image above the fold on the page this product exists to
        // serve. It should not wait for anything.
        priority
        className="h-24 w-24 rounded-full object-cover ring-1 ring-border"
      />
    );
  }

  /*
   * The fallback is decorative, not informational: the name is in the heading
   * directly below it, so a screen reader announcing a lone letter would only
   * be repeating a fragment of what it is about to read properly.
   */
  return (
    <div
      aria-hidden
      className="flex h-24 w-24 select-none items-center justify-center rounded-full bg-surface-sunken text-3xl font-semibold text-ink-subtle ring-1 ring-border"
    >
      {avatarInitial(profile.displayName, profile.username)}
    </div>
  );
}
