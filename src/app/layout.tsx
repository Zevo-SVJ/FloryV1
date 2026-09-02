import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { siteUrl } from "@/lib/env";
import "@/app/globals.css";

/**
 * The root layout.
 *
 * `metadataBase` is set here so that every route — including the public
 * creator pages, which will carry Open Graph images — can declare relative
 * metadata URLs and have them resolved against the right origin in every
 * environment.
 *
 * Geist is self-hosted through the package, so there is no request to a font
 * CDN on a cold visit. That matters more than usual here: the public page is
 * opened from inside the TikTok and Instagram browsers, on a phone, on mobile
 * data, by someone who will not wait.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "ShowMe",
    template: "%s · ShowMe",
  },
  description: "One page for everything you make.",
  applicationName: "ShowMe",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
