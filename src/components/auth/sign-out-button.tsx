import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * Sign out as a form, not a fetch.
 *
 * A plain form posting to a Server Action means this works before hydration
 * and without JavaScript, and it is a POST, so no link prefetch or crawler can
 * end somebody's session by visiting a URL.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Sign out
      </Button>
    </form>
  );
}
