import { z } from "zod";
import { checkUrl, isEmailAddress, urlSchema } from "@/lib/validation/url";

/**
 * Ways to be reached, as actions rather than links.
 *
 * A contact block is four things a visitor can do — write, call, message on
 * WhatsApp, find the place — and each one is a different scheme. That is the
 * reason it is a block rather than four more link buttons: `links.url` is
 * deliberately `http(s)` only, because a button that silently opens a mail
 * composer is a surprise, and widening that column would put `tel:` behind
 * every link on every page.
 *
 * So the schemes live here, each built by this file from a value that has been
 * validated for that scheme. Nothing a creator types becomes an `href`
 * directly:
 *
 *   email     the address, checked against the same pattern the `mailto:`
 *             constraint on `social_links` uses, then prefixed
 *   phone      digits and an optional `+`, everything else stripped, then
 *             prefixed with `tel:`
 *   whatsapp   digits only, country code required, substituted into
 *             `https://wa.me/<digits>` — never a URL the creator supplied
 *   address    plain text, and optionally an ordinary `https` link the creator
 *             chose. There is no constructed map URL and no map provider baked
 *             in: which map somebody uses is their business, and guessing
 *             would be a third-party request nobody asked for.
 *
 * `?subject=`, `?cc=` and their friends are refused everywhere, in the same
 * spirit as the `mailto:` constraint in the database: a newline inside one is
 * the classic header injection, and a contact button has no use for them.
 */

export const CONTACT_KINDS = ["email", "phone", "whatsapp", "address"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** What each action is called when the creator has not named it themselves. */
export const CONTACT_LABELS: Record<ContactKind, string> = {
  email: "Email",
  phone: "Call",
  whatsapp: "WhatsApp",
  address: "Find us",
};

export const CONTACT_PLACEHOLDERS: Record<ContactKind, string> = {
  email: "you@example.com",
  phone: "+33 6 12 34 56 78",
  whatsapp: "+33 6 12 34 56 78",
  address: "12 Rue de Rivoli, Paris",
};

/* ── Telephone numbers ────────────────────────────────────────────────────── */

/**
 * The characters people actually type in a phone number, and nothing else.
 *
 * Spaces, hyphens, dots, brackets and a leading plus, because that is how a
 * number is written on a business card. They are all decoration: `telDigits`
 * throws them away, and what ends up in the `href` is a plus and digits.
 */
const PHONE_SHAPE = /^\+?[0-9\s().\-/]{5,30}$/;

/** Just the digits, with the leading `+` kept if there was one. */
export function telNumber(input: string): string | null {
  const value = input.trim();
  if (!PHONE_SHAPE.test(value)) return null;

  const digits = value.replace(/[^0-9]/g, "");
  // Six is the shortest real subscriber number; fifteen is E.164's maximum.
  if (digits.length < 6 || digits.length > 15) return null;

  return value.startsWith("+") ? `+${digits}` : digits;
}

/**
 * A WhatsApp number, which is stricter than a phone number.
 *
 * `wa.me` addresses a number in full international form with no punctuation
 * and no plus, so a national number is not merely untidy here — it resolves to
 * somebody else's phone in whichever country WhatsApp guesses. A country code
 * is therefore required, and the way a creator says so is the leading `+`.
 */
export function whatsappNumber(input: string): string | null {
  const value = input.trim();
  if (!PHONE_SHAPE.test(value)) return null;
  if (!value.startsWith("+")) return null;

  const digits = value.replace(/[^0-9]/g, "");
  // Eight digits is the shortest a country code plus a subscriber number gets.
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/* ── The stored shape ─────────────────────────────────────────────────────── */

const itemId = z.string().trim().min(1).max(64);
/** What the button says. Blank falls back to `CONTACT_LABELS`. */
const itemLabel = z.string().trim().max(40).default("");

const emailItem = z.object({
  id: itemId,
  kind: z.literal("email"),
  label: itemLabel,
  value: z
    .string()
    .trim()
    .max(254)
    .refine(isEmailAddress, "Enter an email address."),
});

const phoneItem = z.object({
  id: itemId,
  kind: z.literal("phone"),
  label: itemLabel,
  value: z
    .string()
    .trim()
    .max(30)
    .refine((value) => telNumber(value) !== null, "Enter a phone number."),
});

const whatsappItem = z.object({
  id: itemId,
  kind: z.literal("whatsapp"),
  label: itemLabel,
  value: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => whatsappNumber(value) !== null,
      "Include the country code, like +33 6 12 34 56 78.",
    ),
});

const addressItem = z.object({
  id: itemId,
  kind: z.literal("address"),
  label: itemLabel,
  value: z.string().trim().min(1, "Write the address.").max(120),
  /** An ordinary link the creator chose. Null means the address is just text. */
  url: urlSchema.nullable().default(null),
});

export const contactItemSchema = z.discriminatedUnion("kind", [
  emailItem,
  phoneItem,
  whatsappItem,
  addressItem,
]);

export type ContactItem = z.infer<typeof contactItemSchema>;

/* ── What a visitor presses ───────────────────────────────────────────────── */

/**
 * The `href` for one action, or null when there is nothing to press.
 *
 * Null is a real answer: an address with no link is text, and the renderer
 * draws it as text rather than as a dead button. It is also the answer for a
 * value that no longer validates — a hand-edited row, a schema that has since
 * tightened — because the alternative is putting an unchecked string into an
 * `href` on somebody else's page.
 */
export function contactHref(item: ContactItem): string | null {
  switch (item.kind) {
    case "email":
      return isEmailAddress(item.value) ? `mailto:${item.value.trim()}` : null;

    case "phone": {
      const number = telNumber(item.value);
      return number ? `tel:${number}` : null;
    }

    case "whatsapp": {
      const digits = whatsappNumber(item.value);
      return digits ? `https://wa.me/${digits}` : null;
    }

    /*
     * Re-checked here, and not merely trusted from the schema.
     *
     * Every other case above rebuilds its href from a value it validated in
     * this function, and this one was the exception — it returned the stored
     * URL as it found it. The schema does validate it on the way in and
     * `toPublicPage` validates the whole block again on the way out, so
     * nothing could get through in practice; but this is the last place the
     * value is ours before it is an `href` on a stranger's screen, and "the
     * layer above checked" is the reasoning that eventually turns out to be
     * false. The links renderer re-checks for the same reason.
     *
     * Caught by `__tests__/contact.test.ts`, which hands every kind a
     * `javascript:` URL and insists on null.
     */
    case "address":
      return item.url !== null && checkUrl(item.url) === null ? item.url : null;
  }
}

/** The words on the button. */
export const contactLabel = (item: ContactItem): string =>
  item.label.trim().length > 0 ? item.label.trim() : CONTACT_LABELS[item.kind];

/** The line underneath it — the address, the number, the street. */
export function contactDetail(item: ContactItem): string {
  switch (item.kind) {
    case "email":
      return item.value.trim();
    case "phone":
      return item.value.trim();
    case "whatsapp":
      return item.value.trim();
    case "address":
      return item.value.trim();
  }
}
