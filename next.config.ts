import type { NextConfig } from "next";

/**
 * Response headers, applied to every route.
 *
 * Set in config rather than in `src/proxy.ts` because the proxy does not run
 * on static assets, and because Next.js overwrites some headers a proxy writes
 * during rendering. These four cost nothing and close the cheapest attacks.
 *
 * The Content-Security-Policy is *not* here. It carries a per-request nonce, so
 * it has to be built per request, and it lives in `src/lib/security/csp.ts` and
 * is applied by the proxy. The rest are static and belong in config, because
 * the proxy does not run on static assets.
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
