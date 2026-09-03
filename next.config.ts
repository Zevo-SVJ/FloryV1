import type { NextConfig } from "next";

/**
 * Avatars are loaded from this project's own Supabase Storage and nowhere else.
 *
 * `next/image` refuses a host it has not been told about, which is the useful
 * half of this: an `avatar_url` column is a value a creator will eventually
 * control, and an image tag pointed at an arbitrary host is a request this
 * server makes on a stranger's behalf.
 *
 * `src/lib/public-page/avatar.ts` applies the same restriction before
 * rendering, so a foreign URL becomes an initials fallback rather than a
 * runtime error on a public page. The two must agree; both derive the host
 * from the same environment variable.
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
