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

// The Ringg / DesiVocal web-call widget (screening simulator) loads its bundle
// from jsdelivr, spins up audio workers (blob:), and opens data/audio
// connections to Ringg's hosts. The strict policy below blocks all of that, so
// in DEV we relax the relevant directives to let the live screen run locally.
// Production keeps the strict policy UNCHANGED — when we deploy the call, scope
// these allowances to the /screen route (per-route headers) rather than
// loosening the whole app. (DX note: the widget forces script/style/connect/
// worker/media allowances Ringg doesn't document — discovered empirically.)
const CDN = "https://cdn.jsdelivr.net";

const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${CDN} blob:`
  : "script-src 'self' 'unsafe-inline'";
const styleSrc = isDev
  ? `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${CDN}`
  : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com";
const fontSrc = isDev
  ? `font-src 'self' https://fonts.gstatic.com ${CDN} data:`
  : "font-src 'self' https://fonts.gstatic.com";
const mediaSrc = isDev ? "media-src 'self' blob: https:" : "media-src 'self' blob:";
const workerSrc = isDev ? "worker-src 'self' blob:" : "worker-src 'self'";
// Ringg's widget media/data hosts aren't documented; allow https:/wss: in DEV
// so the call connects regardless of which realtime host it uses. Tighten to
// specific Ringg hosts once observed in the network panel.
const connectSrc = isDev
  ? "connect-src 'self' https: wss:"
  : "connect-src 'self' https://api.anthropic.com https://api.openai.com";

const cspDirectives = [
  "default-src 'self'",
  scriptSrc,
  styleSrc,
  fontSrc,
  "img-src 'self' data: https:",
  // Sarvam Bulbul TTS audio is fetched server-side via /api/voice/synthesize
  // and replayed via blob: URLs in the browser, so media-src needs blob:.
  mediaSrc,
  workerSrc,
  "frame-src 'self' https://www.youtube.com https://stream.mux.com",
  // connect-src 'self' covers /api/voice/* proxies; provider hosts are
  // contacted server-side from the Edge runtime, not the browser.
  connectSrc,
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
