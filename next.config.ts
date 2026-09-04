import type { NextConfig } from "next";

/**
 * Response headers, applied to every route.
 *
 * Set in config rather than in `src/proxy.ts` because the proxy does not run
 * on static assets, and because Next.js overwrites some headers a proxy writes
 * during rendering. These four cost nothing and close the cheapest attacks.
 *
 * A Content-Security-Policy is deliberately absent for now. A real one needs a
 * per-request nonce threaded through the proxy for Next's own inline bootstrap
 * scripts, and a policy that looks right but ships `unsafe-inline` is worse
 * than none — it reads as protection while providing none. LOCK renders no
 * user-supplied HTML and embeds nothing third-party yet, so the protection a
 * CSP would add is currently structural. It is on the list for Prompt 9.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* Nothing in LOCK is meant to be framed, and everything behind the shell is
     somebody's private account. */
  { key: "X-Frame-Options", value: "DENY" },
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

  // LOCK is private. There is no reason to advertise the framework on every
  // request, and the header is one fewer thing pointed at a version number.
  poweredByHeader: false,
};

export default nextConfig;
