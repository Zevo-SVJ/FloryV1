import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/app/providers";
import { AnalyzeOverlay } from "@/analyze/AnalyzeOverlay";
import { TopBar } from "@/components/site/TopBar";
import { Footer } from "@/components/site/Footer";
import "@/app/globals.css";

/**
 * Instrument Sans carries every headline and every score; Geist carries the
 * interface. Both are loaded locally, so there is no third-party request and no
 * flash of fallback type on the hero.
 */
const display = localFont({
  variable: "--font-instrument-sans",
  display: "swap",
  src: [{ path: "../fonts/InstrumentSans-Variable.woff2", weight: "400 700", style: "normal" }],
});

export const metadata: Metadata = {
  title: {
    default: "Blink — Know what people think before they follow.",
    template: "%s · Blink",
  },
  description:
    "Blink reads an Instagram profile screenshot the way a stranger does and reports the first impression it creates — eight dimensions, and exactly what to change.",
  applicationName: "Blink",
  openGraph: {
    title: "Blink — Know what people think before they follow.",
    description:
      "One screenshot. Eight dimensions of the impression a stranger forms before they read a word.",
    type: "website",
    siteName: "Blink",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blink — Know what people think before they follow.",
    description: "The first impression your profile makes, measured.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbfbfc",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <TopBar />
          <main>{children}</main>
          <Footer />
          <AnalyzeOverlay />
        </Providers>
      </body>
    </html>
  );
}
