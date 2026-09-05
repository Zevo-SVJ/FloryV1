import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/surface";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { Profile } from "@/types/database";

/**
 * Who you are, at the foot of the sidebar.
 *
 * The role is shown to everybody rather than only to staff. On a platform where
 * what you can reach depends on what you are, that is worth stating plainly
 * instead of leaving somebody to infer it from a link they cannot find.
 *
 * The email is the fallback name, and it is truncated rather than wrapped: a
 * long address must not widen the sidebar.
 */
export function AccountBlock({
  profile,
  email,
}: {
  profile: Profile;
  email: string | null;
}) {
  const name = profile.display_name?.trim();

  return (
    <div className="space-y-3 border-t border-border p-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} email={email} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{name ?? "Your account"}</p>
          {email ? <p className="truncate text-xs text-ink-subtle">{email}</p> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Badge tone={profile.role === "learner" ? "quiet" : "accent"}>{profile.role}</Badge>
        <SignOutButton />
      </div>
    </div>
  );
}
