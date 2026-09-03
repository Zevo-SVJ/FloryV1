import { SocialIcon } from "@/components/public/social-icon";
import type { ContactKind } from "@/lib/contact/actions";

/**
 * The marker beside a contact row.
 *
 * Three of the four already exist. Email and WhatsApp are platform marks the
 * socials row ships, so they are reused rather than redrawn — a second
 * envelope glyph a few pixels different from the first is how an interface
 * starts to look assembled. Only the handset and the pin are new, and both are
 * single paths on the same 24-unit grid, in `currentColor`, so they inherit
 * the row's colour and need no second set for dark backgrounds.
 */

const PHONE =
  "M6.6 3h3l1.5 3.75-1.87 1.13a11.3 11.3 0 0 0 5.9 5.9l1.12-1.88L20 13.4v3a2 2 0 0 1-2.18 2A16.5 16.5 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3z";

const PIN = "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z";

function Stroked({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-full w-full"
    >
      <path d={d} />
    </svg>
  );
}

export function Icon({ kind }: { kind: ContactKind }) {
  switch (kind) {
    case "email":
      return <SocialIcon platform="email" className="h-full w-full" />;
    case "whatsapp":
      return <SocialIcon platform="whatsapp" className="h-full w-full" />;
    case "phone":
      return <Stroked d={PHONE} />;
    case "address":
      return <Stroked d={PIN} />;
  }
}
