import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Fonts via next/font (self-hosted, swap, no render-blocking import). Inter is
// the primary UI and reading typeface. JetBrains Mono is kept for genuine code,
// API-key values, and the live timer. Instrument Serif remains available for the
// routes that have not yet moved to the Linear direction.
const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mockingbird, PM interview practice that talks back",
  description:
    "Real Product Design cases, out loud, with an interviewer who hears you skip CIRCLES and asks the missing question. Bring your own API keys.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
