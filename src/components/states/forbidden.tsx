import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/states/state-block";
import { AFTER_SIGN_IN } from "@/lib/auth/routes";
import type { AppRole } from "@/types/database";

/**
 * The page a signed-in account sees when its role does not clear a section.
 *
 * Rendered in place rather than redirected. A redirect here would be a small
 * lie — it suggests the page does not exist, when the truth is that it does and
 * this account is not the audience for it. Saying so plainly is also the only
 * version somebody can act on.
 *
 * It names the role the account has, which is a deliberate call: this is a
 * private platform with a handful of accounts, and "you are signed in as a
 * learner" is the sentence that ends the confusion. It would be the wrong call
 * on a public product.
 */
export function Forbidden({ role }: { role: AppRole }) {
  return (
    <StateBlock
      eyebrow="Not available"
      title="This section is not for your account."
      description={
        <>
          You are signed in as a <span className="font-medium text-ink">{role}</span>. This
          area is for mentors and administrators.
        </>
      }
      actions={
        <ButtonLink href={AFTER_SIGN_IN} variant="secondary" size="sm">
          Back to the dashboard
        </ButtonLink>
      }
    />
  );
}
