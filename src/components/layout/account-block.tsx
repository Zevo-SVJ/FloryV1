import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { Profile } from "@/types/database";

/**
 * Who you are, at the foot of the navigation.
 *
 * One row: avatar, name, and the way out. The role used to be a badge here and
 * is now only present for staff — a learner seeing the word "learner" under
 * their own name every time they look at the sidebar learns nothing from it,
 * and on a platform with exactly one learner it is noise. It still matters for
 * a mentor or an admin, because what they can reach depends on it.
 *
 * It renders in three places and adapts by inheritance rather than by prop: the
 * expanded rail, the collapsed rail (where the rail's `data-collapsed` hides
 * everything but the avatar), and the phone's More sheet.
 */
export function AccountBlock({
  profile,
  email,
}: {
  profile: Profile;
  email: string | null;
}) {
  const name = profile.display_name?.trim();
  const staff = profile.role !== "learner";

  return (
    <div className="flex items-center gap-2.5 rounded-control p-2">
      <Avatar name={name} email={email} />

      <div className="min-w-0 flex-1 group-data-[collapsed=true]/rail:hidden">
        <p className="truncate text-subhead font-medium text-ink">
          {name ?? email ?? "Your account"}
        </p>
        {/* A second line only when it says something. An address truncated to
            four characters in a 15rem rail is not information, and "learner" on
            a platform with one learner is not either. */}
        {staff ? (
          <p className="truncate text-caption text-ink-subtle">{profile.role}</p>
        ) : null}
      </div>

      <div className="group-data-[collapsed=true]/rail:hidden">
        <SignOutButton />
      </div>
    </div>
  );
}
