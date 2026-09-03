import { ImageResponse } from "next/og";
import { getPublicPage } from "@/lib/public-page/query";
import { pageName, readableAddress } from "@/lib/seo/page-meta";
import { usernameFromPath } from "@/lib/validation/username";
import { siteUrl } from "@/lib/env";

/**
 * The card people see when a ShowMe link is pasted somewhere.
 *
 * Generated rather than uploaded, because the alternative is worse in both
 * directions: asking a creator to make a 1200×630 image is a job nobody does,
 * and using their square avatar as the card leaves every platform to crop it
 * — which on Discord and iMessage means a face with the top of its head
 * removed.
 *
 * It is drawn in the creator's own palette. The background, text and accent
 * come from the same resolved design the page itself wears, so a link to a
 * Noir page previews dark and a link to a Paper page previews warm. That costs
 * nothing — the design is in the same row the name is — and it makes the
 * preview feel like the page rather than like our template.
 *
 * ── What it does not contain ────────────────────────────────────────────────
 *
 * Nothing private, and the list is worth being explicit about because this
 * image is generated on a server that has a session-less client and no reason
 * to reach further: no email, no view or click counts, no plan, no analytics of
 * any kind. Everything on the card is already visible to anybody who opens the
 * page — the name, the handle, the bio, the avatar, the address.
 *
 * ── Fonts ──────────────────────────────────────────────────────────────────
 *
 * The renderer's own bundled sans, and no `fonts` option. Loading Geist would
 * mean reading a `.ttf` out of `node_modules` at request time and trusting
 * that the file was traced into the deployment — a runtime dependency on the
 * shape of the build, in a route whose failure mode is that every shared link
 * loses its preview. The default face is clean, and a card is four lines of
 * text.
 *
 * ── Satori is not a browser ─────────────────────────────────────────────────
 *
 * Two rules that this file follows deliberately, because breaking either
 * throws at request time rather than rendering something slightly wrong:
 *
 *   · every element with more than one child must declare `display`. That
 *     includes text: `@{username}` is *two* JSX children, a string and an
 *     expression, and it took a 500 on this route to notice. Every text node
 *     below is therefore a single interpolation.
 *   · there is no `text-overflow`, so long text is clamped by `maxHeight` and
 *     `overflow: hidden` instead.
 */

export const alt = "ShowMe page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * Cached like the page it belongs to. The card changes only when the page
 * changes, and regenerating a PNG on every crawler request would make the
 * preview slower than the page.
 */
export const revalidate = 60;

/** The largest avatar worth inlining into a card. */
const MAX_AVATAR_BYTES = 2_000_000;
const AVATAR_TIMEOUT_MS = 2500;

/**
 * The avatar, as a data URI, or null.
 *
 * Fetched here rather than passed as a `src` for the renderer to resolve, for
 * one reason: a failed fetch inside the renderer throws, and a throw in this
 * route is a shared link with no preview at all. Fetching it explicitly means
 * a slow or missing image costs the avatar and keeps the card.
 *
 * The URL has already been narrowed by `renderableMediaUrl` to `https` on our
 * own Storage host, so this is not a request to an address a creator chose —
 * which is the whole reason avatars were restricted to that host in Phase 3.
 */
async function avatarData(url: string | null): Promise<string | null> {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return null;

    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const resolved = usernameFromPath(raw);
  const page =
    resolved.kind === "canonical" ? await getPublicPage(resolved.username) : null;

  /*
   * A name nobody has claimed still gets a card. Nothing links to it, so
   * almost nothing will ever request one — but a 500 here would be a 500 on a
   * metadata route, and the plainest possible fallback costs three lines.
   */
  if (!page) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0c0c0c",
            color: "#fafafa",
            fontSize: 64,
            letterSpacing: "-0.03em",
          }}
        >
          ShowMe
        </div>
      ),
      size,
    );
  }

  const { profile, design } = page;
  const name = pageName(profile);
  const address = readableAddress(siteUrl(), profile.username);
  const avatar = await avatarData(profile.avatarUrl);
  const initial = name.replace("@", "").charAt(0).toUpperCase() || "S";

  const { background, text, muted, accent } = design.colors;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background,
          color: text,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {avatar ? (
            /*
             * A plain `<img>`, not `next/image`. The card is rendered to a PNG
             * by satori on the server: there is no browser, no srcset and no
             * optimizer in the picture, and `next/image` would have nothing to
             * do here even if it worked.
             */
            <img
              src={avatar}
              alt=""
              width={200}
              height={200}
              style={{ width: 200, height: 200, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // A tint of the page's own text colour, which is the same
                // fallback the page's header uses.
                background: `${text}1a`,
                fontSize: 88,
                fontWeight: 600,
                color: muted,
              }}
            >
              {initial}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                // Satori has no `text-overflow`, so a very long name is
                // clamped by height instead: two lines at this size, then cut.
                maxHeight: 160,
                overflow: "hidden",
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 34, color: muted, marginTop: 10 }}>
              {`@${profile.username}`}
            </div>
          </div>
        </div>

        {profile.bio ? (
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.45,
              color: muted,
              maxWidth: 980,
              maxHeight: 150,
              overflow: "hidden",
            }}
          >
            {profile.bio}
          </div>
        ) : null}

        {/*
          * The address as a badge rather than a line with a dot before it. The
          * first version put a small accent circle to the left, and at this
          * size it read as a bullet point — a list of one. A pill in a tint of
          * the page's own text colour says "this is the address" without
          * needing a label, and the accent bar carries the creator's colour
          * without competing with it.
          */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              paddingLeft: 22,
              paddingRight: 30,
              paddingTop: 16,
              paddingBottom: 16,
              borderRadius: 999,
              background: `${text}0f`,
              fontSize: 30,
            }}
          >
            <div style={{ width: 6, height: 26, borderRadius: 999, background: accent }} />
            <div style={{ color: text, fontWeight: 600 }}>{address}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
