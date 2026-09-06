import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/env";
import "@/app/globals.css";

/**
 * The root layout.
 *
 * No web font. LOCK renders in the reader's own system face — SF on Apple
 * hardware, Segoe UI Variable on Windows, Roboto on Android — which is the
 * fastest possible first paint, has no swap flash, and is most of why an
 * interface reads as native rather than as a site. It replaced a self-hosted
 * Geist: a good face, but one that made every screen look like a developer
 * tool, which is the opposite of what this product is for.
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
  /* The navigation floats over the content, so the page must extend under the
     status bar and the home indicator rather than stopping politely short of
     them. `.pb-tabbar` and `.bottom-safe` do the actual clearing. */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
