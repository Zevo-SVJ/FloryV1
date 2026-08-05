import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/app/providers";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import "@/app/globals.css";

/**
 * Instrument Serif is used for exactly three or four words on the entire
 * site. It is loaded locally so there is no third-party request and no
 * flash of fallback italics on the headline.
 */
const instrumentSerif = localFont({
  variable: "--font-instrument-serif",
  display: "swap",
  src: [
    {
      path: "../fonts/InstrumentSerif-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/InstrumentSerif-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Blink — Know what people think before they follow.",
    template: "%s · Blink",
  },
  description:
    "Blink reads your Instagram profile the way a stranger does — in seconds — and tells you the first impression you are actually making.",
  applicationName: "Blink",
  openGraph: {
    title: "Blink — Know what people think before they follow.",
    description:
      "Upload a screenshot. Blink tells you the impression a stranger forms in the first seconds.",
    type: "website",
    siteName: "Blink",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blink — Know what people think before they follow.",
    description:
      "The first impression your profile makes, measured. One screenshot, nine seconds.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf9f7",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>
          <a
            href="#analyze"
            className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-[0.875rem] focus:text-paper"
          >
            Skip to the demo
          </a>
          <Nav />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
