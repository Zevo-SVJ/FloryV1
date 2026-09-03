"use client";

import { ImagePicker, TextAreaField, TextField, Toggle } from "@/components/editor/controls";
import { siteOrigin } from "@/lib/editor/origin";
import type { DraftProfile } from "@/lib/editor/state";

/**
 * Who the page belongs to.
 *
 * Above the blocks and outside them, because the header is not something a
 * creator arranges — every ShowMe page opens with a face, a name and a line,
 * and a page that could hide its own identity would mostly be a page nobody
 * recognises.
 *
 * The address is shown and not editable. A username is write-once for now, and
 * the reason is worth a sentence rather than a disabled input with no
 * explanation: changing it breaks every link anybody has already shared.
 */
export function ProfilePanel({
  profile,
  onChange,
}: {
  profile: DraftProfile;
  onChange: (patch: Partial<DraftProfile>) => void;
}) {
  return (
    <section className="space-y-4 rounded-card border border-border bg-surface p-3">
      <div>
        <h2 className="text-sm font-medium text-ink">Profile</h2>
        <p className="mt-0.5 font-mono text-[0.8125rem] break-all text-ink-subtle">
          {siteOrigin()}/{profile.username}
        </p>
      </div>

      <ImagePicker
        label="photo"
        shape="circle"
        url={profile.avatarUrl}
        onChange={(avatarUrl) => onChange({ avatarUrl })}
      />

      <TextField
        label="Display name"
        value={profile.displayName}
        onChange={(displayName) => onChange({ displayName })}
        placeholder={profile.username}
        maxLength={60}
        hint="Shown as the heading. Leave blank to use your username."
      />

      <TextAreaField
        label="Bio"
        value={profile.bio}
        onChange={(bio) => onChange({ bio })}
        placeholder="One or two lines about you."
        maxLength={280}
        counter
        rows={3}
      />

      {/*
        * Search visibility, and the wording matters as much as the switch.
        *
        * On by default, because a page that cannot be found is a page whose
        * whole growth loop is a creator pasting a link by hand. Off is for
        * somebody whose address is meant only for the people they give it to
        * — and the note says plainly that this is not privacy, because a
        * creator who read it as "make my page private" would be badly
        * misled: the address still works for anybody who has it, as it has
        * to, since it is in their bio.
        */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] font-medium text-ink">Show in search</span>
          <Toggle
            checked={profile.searchVisible}
            onChange={(searchVisible) => onChange({ searchVisible })}
            label="Let search engines index your page"
          />
        </div>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-subtle">
          {profile.searchVisible
            ? "Your page can appear in Google and is listed in our sitemap."
            : "Your page asks search engines not to index it and is left out of our sitemap. It still opens normally for anyone who has the link — this is not a privacy setting."}
        </p>
      </div>
    </section>
  );
}
