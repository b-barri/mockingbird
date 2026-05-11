import type { NextConfig } from "next";

// CSP scaffolding for R6b — the strict policy that protects BYO API keys
// stored in localStorage (when the user opts into cross-reload persistence).
// frame-src is intentionally permissive to allow the homepage demo video embed
// (R3); session pages may need a stricter CSP at deploy time.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "frame-src 'self' https://www.youtube.com https://stream.mux.com",
  // connect-src is extended per active voice/LLM provider in their adapters
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
