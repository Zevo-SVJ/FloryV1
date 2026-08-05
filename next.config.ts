import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev overlay sits on top of the hero film.
  devIndicators: false,
};

export default nextConfig;
