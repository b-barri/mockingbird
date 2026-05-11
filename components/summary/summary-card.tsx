"use client";

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

// R16a 8-element post-session summary card:
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
      className="mx-auto max-w-2xl"
    >
      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" /> Session complete
        </div>
        <h1 className="font-display text-4xl tracking-tight text-ink">
          {caseTitle}
        </h1>
      </header>

      {/* Summary paragraph + states */}
      <section
        data-testid="summary-paragraph"
        className="mb-8 rounded-xl border border-ink/[0.08] bg-white p-7"
      >
        {loading && (
          <div data-testid="summary-loading" className="space-y-2.5">
            <div className="h-3 animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[88%] animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[95%] animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-[70%] animate-pulse rounded bg-ink/10" />
            <p className="mt-4 text-xs italic text-mute">
              Generating summary…
            </p>
          </div>
        )}
        {!loading && error && (
          <div data-testid="summary-error" role="alert">
            <p className="text-sm text-red-700">
              Summary unavailable — your transcript is still saved below.
            </p>
            <p className="mt-2 text-xs text-mute">{error}</p>
          </div>
        )}
        {!loading && !error && summaryText && (
          <>
            <p className="text-base leading-relaxed text-ink">
              {summaryText}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={copySummary}
                className="rounded-md border border-ink/[0.12] bg-white px-3 py-1.5 text-xs text-mute hover:text-ink"
              >
                {copied ? "✓ Copied" : "Copy summary"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Stats row */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-ink/[0.08] bg-white p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            Duration
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums text-ink">
            {duration}
          </div>
        </div>
        <div className="rounded-lg border border-ink/[0.08] bg-white p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            Approx. spend
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums text-ink">
            {spend}
          </div>
          <div className="mt-1 text-[10px] italic text-mute">
            charged to your provider
          </div>
        </div>
        <div className="rounded-lg border border-ink/[0.08] bg-white p-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
            Transcript
          </div>
          {onViewTranscript ? (
            <button
              type="button"
              onClick={onViewTranscript}
              className="text-sm font-medium text-coral hover:underline"
              data-testid="view-transcript"
            >
              View full ↗
            </button>
          ) : (
            <span className="text-xs italic text-mute">Saved locally</span>
          )}
          <div className="mt-1 text-[10px] italic text-mute">
            id: <span className="font-mono">{sessionId.slice(0, 8)}…</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-3 border-t border-ink/[0.08] pt-8">
        <Link
          href="/onboarding/case-select"
          className="rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-cream hover:bg-ink/85"
        >
          Start another session →
        </Link>
        <Link
          href="/"
          className="text-xs text-mute hover:text-ink"
        >
          ← Back to homepage
        </Link>
      </section>
    </article>
  );
}
