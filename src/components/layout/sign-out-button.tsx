"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * Sign out, as a form rather than a link.
 *
 * A GET request must not change state — a link here would be followed by a
 * prefetcher or a preview pane and sign somebody out without them touching
 * anything.
 */
function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Submit />
    </form>
  );
}
