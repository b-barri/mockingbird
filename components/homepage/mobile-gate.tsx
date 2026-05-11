"use client";

import { useEffect, useState } from "react";

// R12 mobile interstitial gate. Shown at viewports under 1024px.
// AE7: copy-link affordance copies the current URL so the visitor can
// open it on a laptop. Renders via CSS-only at the right breakpoint
// (lg:hidden on this component, hidden lg:block on the homepage) so there's
// no SSR/CSR mismatch flash. The clipboard hydration only fires client-side.

export function MobileGate() {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers without clipboard permission fall through silently.
    }
  }

  return (
    <div
      data-testid="mobile-gate"
      className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-12 text-center lg:hidden"
    >
      <div className="mb-6 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
        <span className="h-2 w-2 rounded-full bg-coral shadow-[0_0_10px_rgba(232,93,59,0.4)]" />
        Mockingbird
      </div>
      <h1 className="max-w-md font-display text-4xl leading-tight tracking-tight text-ink">
        Mockingbird is built for desktop voice sessions.
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-mute">
        Open this link on a laptop or desktop to begin. Mobile-responsive
        voice UX is on the roadmap but not in V1.
      </p>
      <div className="mt-10 w-full max-w-sm">
        <div className="overflow-hidden rounded-lg border border-ink/[0.1] bg-white text-left">
          <div className="border-b border-ink/[0.06] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            This page
          </div>
          <div className="break-all px-4 py-3 font-mono text-xs text-ink">
            {currentUrl || "https://..."}
          </div>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="mt-3 w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-cream"
        >
          {copied ? "✓ Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
