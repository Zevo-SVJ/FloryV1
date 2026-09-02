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
};

export default nextConfig;
