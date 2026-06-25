---
title: Strict CSP blocks a third-party voice widget (Ringg web call)
date: 2026-06-25
category: docs/solutions/integration-issues/
module: screening-simulator
problem_type: integration_issue
component: tooling
symptoms:
  - "Widget fails with 'Ringg SDK failed to load' even though the CDN script returns HTTP 200 to curl"
  - "Browser console shows the external jsdelivr script blocked by Content-Security-Policy"
  - "Even after the script loads, the call cannot connect because WebRTC/websocket and blob: audio workers are blocked"
root_cause: config_error
resolution_type: config_change
severity: medium
related_components:
  - "assistant"
tags: [csp, content-security-policy, ringg, third-party-widget, webrtc, nextjs, voice-agent, integration]
---

# Strict CSP blocks a third-party voice widget (Ringg web call)

## Problem
A strict Content-Security-Policy in the host app (added to protect BYO API keys stored client-side) silently blocked the Ringg / DesiVocal web-call widget, so the live screening call could not start. The widget bundle, its audio workers, and its call connections were all denied by the host app's CSP even though every resource was reachable on the network.

## Symptoms
- The widget panel showed "Ringg SDK failed to load", while `curl` fetched the CDN script fine (HTTP 200).
- Browser console showed the external jsdelivr `<script>` blocked by CSP `script-src`.
- After loosening `script-src`, the call still could not connect because the widget's `blob:` audio workers and its WebRTC/websocket connections were blocked by `worker-src` / `connect-src`.

## What Didn't Work
- Verifying the CDN URL and version. The file was live (HTTP 200), so it was not a 404 or a wrong version. `curl` is misleading here because `curl` ignores CSP; only the browser enforces it.
- Suspecting an ES-module-vs-classic-script global-attach problem. The bundle did attach `window.loadAgent` correctly once the CSP allowed it, so that was not the blocker.

## Solution
The host app (`next.config.ts`) shipped a strict CSP with `script-src 'self'` (no external origins) and a narrow `connect-src`. The fix is to admit exactly what the widget needs, **in development only**, and keep production strict (scope the allowances to the widget's route at deploy time).

```ts
// next.config.ts
const CDN = "https://cdn.jsdelivr.net";

const scriptSrc = isDev
  ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${CDN} blob:`
  : "script-src 'self' 'unsafe-inline'";
const styleSrc = isDev
  ? `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${CDN}`
  : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com";
const mediaSrc = isDev ? "media-src 'self' blob: https:" : "media-src 'self' blob:";
const workerSrc = isDev ? "worker-src 'self' blob:" : "worker-src 'self'";
const connectSrc = isDev
  ? "connect-src 'self' https: wss:"
  : "connect-src 'self' https://api.anthropic.com https://api.openai.com";
```

Then restart the dev server. `next.config.ts` is read at boot, not hot-reloaded.

The directives the widget required, at minimum:
- `script-src`: the CDN origin plus `blob:` (audio worklet/worker code)
- `style-src`: the CDN origin (the widget injects a stylesheet)
- `worker-src`: `blob:`
- `media-src`: `blob:` (plus `https:` for audio)
- `connect-src`: the realtime media/data hosts. Ringg does not document these, so `https:` and `wss:` in dev cover whatever host it uses.

A second, separate gate appears only after CSP is fixed: the widget shows "Domain not allowed to initiate webcall". The web-call public key is protected by a domain whitelist, so the running origin (e.g. `localhost:3000`) must be added to the assistant's whitelist in the vendor dashboard.

## Why This Works
CSP is enforced by the browser per document. `curl` and server-side fetches ignore it, which is why the script looked fine outside the browser. `script-src 'self'` denies every cross-origin script, so the jsdelivr bundle never executed. Voice widgets additionally need `blob:` workers (audio processing) and a broad `connect-src` (WebRTC/websocket to their media servers). Admitting exactly those directives lets the widget load and connect. Keeping the relaxation dev-only preserves the strict key-protection posture in production.

## Prevention
- When embedding any third-party browser SDK into a CSP-hardened app, expect to add the SDK's CDN origin (`script-src` / `style-src`), `blob:` (`worker-src` and `script-src`, for audio/worklet code), and the SDK's realtime hosts (`connect-src`, for WebRTC/`wss:`). Vendors rarely document these.
- Diagnose suspected resource-load failures via the browser console, not `curl`. `curl` ignores CSP and will send you chasing a non-existent 404.
- `next.config.ts` CSP changes require a dev-server restart. They are not hot-reloaded.
- For production, scope the relaxed CSP to the widget's route using Next.js `headers()` with a route-specific `source`, and a negative-lookahead on the catch-all rule so two CSP headers do not get sent and intersect into the stricter policy. Tighten `connect-src` from `https:`/`wss:` to specific vendor hosts once observed in the network panel.
- Remember the second gate: a browser-visible web-call public key is protected by a domain whitelist. Whitelist every origin you run from (local, staging, production).

## Related Issues
- DX-teardown journal (planning workspace): `docs/ringg-dx-teardown.md` covers the broader set of Ringg integration findings.
- PR #2 (`b-barri/mockingbird`): the screening simulator implementation that surfaced this.
