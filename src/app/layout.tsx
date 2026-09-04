import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { siteUrl } from "@/lib/env";
import "@/app/globals.css";

/**
 * The root layout.
 *
 * Geist is self-hosted through its package, so there is no request to a font
 * CDN on a cold visit and no layout shift while a face downloads. Both faces
 * are loaded because the design system uses the monospace as a texture, not as
 * an occasional code block.
 *
 * LOCK is private, so it tells crawlers to leave it alone at the root rather
 * than route by route.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "LOCK",
    template: "%s · LOCK",
  },
  description: "Build real SaaS products with AI.",
  applicationName: "LOCK",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
