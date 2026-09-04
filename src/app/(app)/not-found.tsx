import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { AFTER_SIGN_IN } from "@/lib/auth/routes";

/**
 * The 404 inside the shell.
 *
 * Keeps the navigation, which is the whole reason it exists separately from the
 * root one: a mistyped URL should look like a wrong turn, not like the
 * application falling over.
 */
export default function AppNotFound() {
  return (
    <StateBlock
      eyebrow="404"
      title="There is nothing here."
      description="This section may not have been built yet."
      actions={
        <ButtonLink href={AFTER_SIGN_IN} variant="secondary" size="sm">
          Back to the dashboard
        </ButtonLink>
      }
    />
  );
}
