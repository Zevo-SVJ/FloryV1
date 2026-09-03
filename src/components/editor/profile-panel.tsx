"use client";

import { ImagePicker, TextAreaField, TextField } from "@/components/editor/controls";
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
    </section>
  );
}
