import type { NextConfig } from "next";

// CSP scaffolding for R6b — the strict policy that protects BYO API keys
// stored in localStorage (when the user opts into cross-reload persistence).
// frame-src is intentionally permissive to allow the homepage demo video embed
// (R3); session pages may need a stricter CSP at deploy time.
//
// Dev mode needs 'unsafe-eval' for Next.js React Refresh (hot reload).
// Prod allows inline scripts because Next.js App Router uses inline
// <script>self.__next_f.push(...)</script> tags to stream React Server
// Component data; blocking them silently truncates the RSC stream and
// React 19 unmounts the entire DOM after hydration fails. The "right"
// answer is nonce-based CSP via middleware (each inline script gets a
// per-request nonce); 'unsafe-inline' is the pragmatic V1 tradeoff while
// the rest of the XSS-resistance posture (no dangerouslySetInnerHTML, no
// untrusted HTML rendering anywhere) holds — see the security audit
// notes. Tighten when adding more user-supplied content surfaces.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline'";

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
  async rewrites() {
    return [
      // /design-shotgun is a static design-exploration hub served from
      // public/. Next.js strips the trailing slash and then can't resolve
      // the extensionless path, so we rewrite the bare directory to its
      // index file. Remove this when the exploration is archived.
      { source: "/design-shotgun", destination: "/design-shotgun/index.html" },
    ];
  },
};

export default nextConfig;
