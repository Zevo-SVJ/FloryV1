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
 * the platform is spelled out for anyone not looking at it.
 */
export function SocialRow({ socials }: { socials: PublicSocial[] }) {
  if (socials.length === 0) return null;

  return (
    <nav aria-label="Social profiles" className="mt-7">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        {socials.map((social) => (
          <li key={social.id}>
            <a
              href={social.url}
              rel="me nofollow ugc noopener"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <SocialIcon platform={social.platform} className="h-5 w-5" />
              <span className="sr-only">{socialLabel(social.platform)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
