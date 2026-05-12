"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface SummaryCardProps {
  /** Generated summary text, or undefined while loading. */
  summaryText?: string;
  /** Loading flag — shows skeleton when true. */
  loading: boolean;
  /** Error message when generation failed. */
  error?: string;
  /** Case title for context. */
  caseTitle: string;
  /** Session duration formatted as MM:SS. */
  duration: string;
  /** Approximate spend formatted as $X.XXX. */
  spend: string;
  /** Session id for the "view transcript" link. */
  sessionId: string;
  /** Handler for "View full transcript". */
  onViewTranscript?: () => void;
}

// R16a 8-element post-session summary card in the Pre-flight Console direction:
//   (a) summary paragraph (with skeleton while loading)
//   (b) copy-to-clipboard
//   (c) session duration
//   (d) transcript link
//   (e) approximate spend
//   (f) primary CTA → /onboarding/case-select
//   (g) loading state
//   (h) error state
export function SummaryCard({
  summaryText,
  loading,
  error,
  caseTitle,
  duration,
  spend,
  sessionId,
  onViewTranscript,
}: SummaryCardProps) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied — surface in console only
    }
  }

  return (
    <article
      data-testid="summary-card"
      data-loading={loading}
      data-error={!!error}
      className="mx-auto max-w-4xl"
    >
      {/* Header */}
      <header className="mb-10">
        <div className="mb-4 flex items-center gap-2 font-mono text-[11px] tracking-wide text-coral">
          <span className="pulse-dot" />
          SESSION COMPLETE &middot; {duration}
        </div>
        <h1 className="mb-3 font-display text-5xl leading-[1.0] tracking-tight text-ink md:text-6xl">
          {caseTitle}
        </h1>
        <p className="font-mono text-[14px] leading-relaxed text-mute">
          // nice. here&apos;s the read on what just happened.
        </p>
      </header>

      {/* Banner — Ember post-analysis. searching.png while loading, analyzed.png done. */}
      <div
        data-testid="summary-illustration"
        data-loading={loading}
        className="brand-image-glow mb-12"
      >
        <Image
          key={loading ? "searching" : "analyzed"}
          src={loading ? "/branding/searching.png" : "/branding/analyzed.png"}
          alt={
            loading
              ? "Ember inspecting your transcript with a magnifying glass"
              : "Ember with the analysis complete"
          }
          width={1448}
          height={1086}
          priority
          className="w-full rounded-2xl shadow-[0_24px_50px_-22px_rgba(26,22,18,0.4)] ring-1 ring-ink/[0.08]"
        />
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[11px] tracking-wide text-mute">
            <span className="pulse-dot" />
            reading your transcript&hellip;
          </div>
        )}
      </div>

      {/* Stats row — 3 tan mono panels */}
      <section className="mb-10 grid grid-cols-3 gap-3">
        <div className="pf-panel p-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
            duration
          </div>
          <div className="font-mono text-[28px] font-semibold leading-none tabular-nums text-ink">
            {duration}
          </div>
          <div className="mt-2 font-mono text-[10px] text-mute">
            // of 30:00 target
          </div>
        </div>
        <div className="pf-panel p-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
            approx. damage
          </div>
          <div className="font-mono text-[28px] font-semibold leading-none tabular-nums text-ink">
            {spend}
          </div>
          <div className="mt-2 font-mono text-[10px] text-mute">
            // charged to your provider, not us
          </div>
        </div>
        <div className="pf-panel p-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
            transcript
          </div>
          {onViewTranscript ? (
            <button
              type="button"
              onClick={onViewTranscript}
              className="font-mono text-[14px] font-medium text-coral hover:underline"
              data-testid="view-transcript"
            >
              view full ↗
            </button>
          ) : (
            <span className="font-mono text-[11px] italic text-mute">
              saved locally
            </span>
          )}
          <div className="mt-2 font-mono text-[10px] text-mute">
            id: <span className="text-ink">{sessionId.slice(0, 8)}…</span>
          </div>
        </div>
      </section>

      {/* Summary paragraph — Alex's read */}
      <section
        data-testid="summary-paragraph"
        className="mb-10 rounded-md border border-ink/[0.10] bg-white p-7 md:p-8"
      >
        <div className="ascii-rule mb-5">
          ── ALEX&rsquo;S READ ────────────────────────────────────
        </div>

        {loading && (
          <div data-testid="summary-loading" className="space-y-2.5">
            <div className="h-3 animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[88%] animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[95%] animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[70%] animate-pulse rounded bg-ink/10" />
            <p className="mt-4 font-mono text-[11px] italic text-mute">
              Generating summary — Alex is writing your feedback…
            </p>
          </div>
        )}
        {!loading && error && (
          <div data-testid="summary-error" role="alert">
            <p className="text-base leading-relaxed text-red-700">
              Summary unavailable — your transcript is still saved below, so
              nothing&apos;s lost.
            </p>
            <p className="mt-2 font-mono text-[11px] text-mute">{error}</p>
          </div>
        )}
        {!loading && !error && summaryText && (
          <>
            <div className="space-y-4">
              {summaryText.split(/\n\n+/).map((para, i) => (
                <p
                  key={i}
                  className="text-[16px] leading-[1.7] text-ink"
                >
                  {para}
                </p>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={copySummary}
                className="rounded-[3px] border border-ink/15 bg-cream px-3 py-1.5 font-mono text-[11px] text-mute hover:border-ink hover:text-ink"
              >
                {copied ? "✓ Copied" : "Copy summary"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-ink/[0.08] pt-10 text-center">
        <h2 className="mb-3 font-display text-3xl leading-tight tracking-tight text-ink md:text-4xl">
          Run it again.
        </h2>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-mute">
          The best candidates ran this loop three times before their onsite.
          New random case, same Alex.
        </p>
        <Link
          href="/onboarding/case-select"
          className="pf-exec-btn"
        >
          <span className="arrow">▸</span>
          Start another session
          <span className="animate-caret-blink text-cream/85" aria-hidden>
            _
          </span>
        </Link>
        <p className="mt-8 font-mono text-[11px] text-mute">
          <Link href="/" className="hover:text-ink">
            ← Back to homepage
          </Link>
        </p>
      </section>
    </article>
  );
}
