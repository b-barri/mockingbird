import type { NextConfig } from "next";

// CSP scaffolding for R6b — the strict policy that protects BYO API keys
// stored in localStorage (when the user opts into cross-reload persistence).
// frame-src is intentionally permissive to allow the homepage demo video embed
// (R3); session pages may need a stricter CSP at deploy time.
//
// Dev mode needs 'unsafe-eval' for Next.js React Refresh (hot reload).
// Production strips it so the strict R6b posture holds in deployed builds.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self'";

const cspDirectives = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  // Sarvam Bulbul TTS audio is fetched server-side via /api/voice/synthesize
  // and replayed via blob: URLs in the browser, so media-src needs blob:.
  "media-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://stream.mux.com",
  // connect-src 'self' covers /api/voice/* proxies; provider hosts are
  // contacted server-side from the Edge runtime, not the browser.
  "connect-src 'self' https://api.anthropic.com https://api.openai.com",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
