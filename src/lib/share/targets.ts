/**
 * Where a creator can send their page, and how.
 *
 * Every entry here is one of two things, and the distinction is the honest
 * part of this feature: a platform either accepts a link through a documented
 * web intent, or it does not. There is no third category, and pretending
 * otherwise is how a share sheet ends up with an Instagram button that opens
 * a broken URL.
 *
 *   intent   a URL that opens the platform's own composer with the link
 *            already in it — X, WhatsApp, Telegram, email
 *   copy     no web intent exists, so the button puts the address on the
 *            clipboard and says where to paste it — Instagram, TikTok
 *
 * Instagram and TikTok are in the second group not as a shortcut but because
 * that is what they are. Neither has a public URL that composes a post
 * containing a link: on Instagram a link goes in a bio or a story sticker, on
 * TikTok in a profile bio, and both are done by pasting. The button that does
 * exactly that, and says so, is more use than one that opens a web composer
 * the platform does not have.
 *
 * ── Building the URLs ───────────────────────────────────────────────────────
 *
 * Every value substituted into an intent goes through `encodeURIComponent`,
 * and the text is stripped of control characters first. The address is our own
 * canonical URL and is not user input, but the creator's display name is —
 * and it ends up in a `mailto:` subject, where an unescaped line break is the
 * classic header injection. Encoding covers it; stripping means we are not
 * relying on every mail client agreeing about `%0A`.
 */

export const SHARE_TARGETS = [
  "x",
  "whatsapp",
  "telegram",
  "email",
  "instagram",
  "tiktok",
] as const;

export type ShareTarget = (typeof SHARE_TARGETS)[number];

export interface ShareAction {
  target: ShareTarget;
  label: string;
  /** An intent URL to open, or null when the platform has none. */
  href: string | null;
  /** What the button should say after it has put the link on the clipboard. */
  copyHint: string | null;
}

const LABELS: Record<ShareTarget, string> = {
  x: "X",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "Email",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export const shareLabel = (target: ShareTarget): string => LABELS[target];

/**
 * Text safe to substitute into a URL.
 *
 * Control characters removed, then collapsed whitespace, then a length the
 * platforms will not truncate awkwardly. A display name is at most 60
 * characters by its own schema, so this only ever trims a pathological value.
 */
function clean(text: string): string {
  return text
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * The one sentence that travels with the link.
 *
 * Written from the creator's point of view, because they are the one sending
 * it. No "Check out my ShowMe!" — a creator sharing their own page is sharing
 * their work, and naming our product in a message they did not write is the
 * kind of small imposition that makes people paste a bare URL instead.
 */
export function shareMessage(name: string): string {
  const named = clean(name);
  return named.length > 0 ? named : "My links";
}

/** Every target, resolved for one page. */
export function shareActions(url: string, name: string): ShareAction[] {
  const address = encodeURIComponent(url);
  const text = encodeURIComponent(shareMessage(name));

  return SHARE_TARGETS.map((target) => {
    switch (target) {
      case "x":
        return {
          target,
          label: LABELS[target],
          // `/intent/post`, not the old `/intent/tweet` — the latter still
          // redirects, and a redirect inside a share flow is a chance to lose.
          href: `https://x.com/intent/post?url=${address}&text=${text}`,
          copyHint: null,
        };

      case "whatsapp":
        return {
          target,
          label: LABELS[target],
          // wa.me with no number: WhatsApp asks which chat, which is right —
          // a creator sharing a page has not yet decided who to send it to.
          href: `https://wa.me/?text=${text}%20${address}`,
          copyHint: null,
        };

      case "telegram":
        return {
          target,
          label: LABELS[target],
          href: `https://t.me/share/url?url=${address}&text=${text}`,
          copyHint: null,
        };

      case "email":
        return {
          target,
          label: LABELS[target],
          href: `mailto:?subject=${text}&body=${address}`,
          copyHint: null,
        };

      case "instagram":
        return {
          target,
          label: LABELS[target],
          href: null,
          copyHint: "Copied — paste it into your Instagram bio or a story link.",
        };

      case "tiktok":
        return {
          target,
          label: LABELS[target],
          href: null,
          copyHint: "Copied — paste it into your TikTok bio.",
        };
    }
  });
}
