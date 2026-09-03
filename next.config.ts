import type { NextConfig } from "next";

/**
 * Avatars are loaded from this project's own Supabase Storage and nowhere else.
 *
 * `next/image` refuses a host it has not been told about, which is the useful
 * half of this: an `avatar_url` column is a value a creator will eventually
 * control, and an image tag pointed at an arbitrary host is a request this
 * server makes on a stranger's behalf.
 *
 * `src/lib/media/url.ts` applies the same restriction before rendering, so a
 * foreign URL becomes an initials fallback rather than a runtime error on a
 * public page. The two must agree; both derive the host from the same
 * environment variable.
 */
function supabaseImageHost(): { protocol: "https"; hostname: string }[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return [];

  try {
    return [{ protocol: "https", hostname: new URL(url).hostname }];
  } catch {
    return [];
  }
}

/**
 * Response headers, on everything.
 *
 * Set here rather than in the proxy for one reason that matters: the proxy
 * does not run on static assets, and Next.js replaces a `cache-control` the
 * proxy writes when it renders — headers set from config survive both. A
 * public creator page is opened from inside the TikTok and Instagram
 * browsers, and these are the four lines that cost nothing and close the
 * cheapest attacks.
 *
 * A Content-Security-Policy is deliberately absent. Writing a real one here
 * means a per-request nonce threaded through the proxy for Next's own inline
 * bootstrap scripts, and a `frame-src` that has to stay in step with
 * `lib/embeds/providers.ts` — a policy that drifts out of step with the embed
 * list breaks a creator's video silently, in production, on somebody else's
 * phone. The protections a CSP would add are already structural here: no
 * `dangerouslySetInnerHTML` outside one escaped JSON-LD block, no user value
 * ever becomes CSS or an iframe `src`, and uploads cannot be SVG. It is worth
 * adding, and it is worth adding deliberately rather than as a header that
 * looks right and is `unsafe-inline`.
 */
const securityHeaders = [
  // The one that closes MIME sniffing on uploaded media served through us.
  { key: "X-Content-Type-Options", value: "nosniff" },
  /*
   * Send the origin to other sites and the full path to our own. A creator
   * page links out constantly, and the path is `/<username>` — the referrer
   * would otherwise tell every destination which creator sent the visitor.
   */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /*
   * Nothing in this product is meant to be framed. Clickjacking a page whose
   * whole purpose is buttons that get clicked is the obvious attack.
   */
  { key: "X-Frame-Options", value: "DENY" },
  /*
   * No feature here needs a camera, a microphone or a location, and a
   * third-party embed inside an iframe should not be able to ask for one on a
   * creator's behalf.
   */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The public creator page is linked from social apps; there is no reason to
  // advertise the framework on every request.
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseImageHost(),
  },
  experimental: {
    serverActions: {
      /*
       * Images are uploaded through a Server Action, and the default cap on an
       * action's body is 1MB — below the 5MB an image is allowed to be, so
       * without this every large upload would fail at the framework before any
       * of our own checks ran. The extra megabyte covers multipart overhead:
       * boundaries, part headers and field metadata all count toward the raw
       * body, and a file at exactly the limit would otherwise be refused.
       *
       * This is a ceiling, not a policy. The upload action and the Storage
       * bucket both enforce 5MB, and they are what decide.
       */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
