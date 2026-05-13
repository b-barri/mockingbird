import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mockingbird — PM interview practice that talks back",
  description:
    "Real Product Design cases, out loud, with an interviewer who hears you skip CIRCLES and asks the missing question. Bring your own API keys.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
