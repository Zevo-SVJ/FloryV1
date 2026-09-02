import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The public creator page is linked from social apps; there is no reason to
  // advertise the framework on every request.
  poweredByHeader: false,
};

export default nextConfig;
