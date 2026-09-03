import { SocialIcon, socialLabel } from "@/components/public/social-icon";
import type { PublicSocial } from "@/lib/public-page/types";

/**
 * Where else this creator is.
 *
 * A row of marks rather than a second list of buttons: these are secondary to
 * whatever the creator is actually pointing at, and giving them the same weight
 * as the main links would flatten the page into an undifferentiated stack.
 *
 * Each is a real link with a real accessible name — the mark is decorative and
 * the platform is spelled out for anyone not looking at it. The marks
 * themselves are the platforms' own shapes, never an invented approximation of
 * somebody's logo.
 *
 * Whether they sit bare, in a filled circle or in an outlined one is
 * `data-sm-socials`, read by the stylesheet. The target stays 44px in every
 * case, because a design choice may not shrink a tap target.
 */
export function SocialsBlock({ socials }: { socials: PublicSocial[] }) {
  return (
    <nav aria-label="Social profiles">
      <ul className="sm-socials">
        {socials.map((social) => (
          <li key={social.id}>
            <a href={social.url} rel="me nofollow ugc noopener" className="sm-social">
              <SocialIcon platform={social.platform} className="h-5 w-5" />
              <span className="sr-only">{socialLabel(social.platform)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
