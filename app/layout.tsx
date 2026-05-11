import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mockingbird — PM Interview Voice Agent",
  description:
    "Practice PM interviews with a voice-first AI interviewer that knows your frameworks.",
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
