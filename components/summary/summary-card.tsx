"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { StructuredFeedback } from "@/lib/llm/summary";

interface SummaryCardProps {
  /** Structured tension-grounded feedback (dimensions + prose), or undefined while loading. */
  feedback?: StructuredFeedback;
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

// Categorical verdict mapped to visual classes (no raw green/amber/red).
// Strong uses primary text, developing uses muted text, missing uses coral
// with a hollow dot to read as absent. Card surfaces come from the
// .pf-verdict-card.is-* classes in globals.css. Verdict is categorical only,
// never a numeric score.
const VERDICT_STYLES: Record<
  "strong" | "developing" | "missing",
  { card: string; verdict: string; dot: string; label: string }
> = {
  strong: {
    card: "is-strong",
    verdict: "text-ink",
    dot: "bg-ink",
    label: "strong",
  },
  developing: {
    card: "is-developing",
    verdict: "text-mute",
    dot: "bg-mute",
    label: "developing",
  },
  missing: {
    card: "is-missing",
    verdict: "text-coral",
    dot: "border border-coral bg-tan",
    label: "missing",
  },
};

function formatFeedbackForClipboard(feedback: StructuredFeedback): string {
  const dimensionLines = feedback.dimensions
    .map((d) => `${d.name}: ${d.verdict.toUpperCase()}\n${d.observation}`)
    .join("\n\n");
  return `${dimensionLines}\n\nWhat worked:\n${feedback.whatWorked}\n\nWhat was missed:\n${feedback.whatMissed}`;
}

// Post-session summary card with eight elements: the summary paragraph (with a
// skeleton while loading), copy to clipboard, session duration, transcript link,
// approximate spend, the primary call to action to /onboarding/case-select, a
// loading state, and an error state.
export function SummaryCard({
  feedback,
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
    if (!feedback) return;
    try {
      await navigator.clipboard.writeText(formatFeedbackForClipboard(feedback));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access was denied, so there is nothing to surface here.
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
        <div className="mb-4 flex items-center gap-2 text-[13px] text-coral">
          <span className="pulse-dot" />
          Session complete &middot; {duration}
        </div>
        <h1 className="mb-3 font-sans text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl sm:leading-[1.0] md:text-6xl">
          {caseTitle}
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Here is how Alex scored that session.
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
          className="mx-auto w-full max-w-md rounded-xl ring-1 ring-white/[0.08]"
        />
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-mute">
            <span className="pulse-dot" />
            Reading the transcript&hellip;
          </div>
        )}
      </div>

      {/* Stats row — three panels. Stack on phone widths so each number stays
          legible, then restore the three-column strip from sm up. */}
      <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="pf-panel p-4">
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-mute">
            Duration
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums text-ink">
            {duration}
          </div>
          <div className="mt-2 text-[12px] text-mute">Of a 30:00 target</div>
        </div>
        <div className="pf-panel p-4">
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-mute">
            Estimated cost
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums text-ink">
            {spend}
          </div>
          <div className="mt-2 text-[12px] text-mute">
            Charged to your provider, not to us
          </div>
        </div>
        <div className="pf-panel p-4">
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-mute">
            Transcript
          </div>
          {onViewTranscript ? (
            <button
              type="button"
              onClick={onViewTranscript}
              className="text-[14px] font-medium text-coral hover:underline"
              data-testid="view-transcript"
            >
              View full transcript
            </button>
          ) : (
            <span className="text-[13px] text-mute">Saved locally</span>
          )}
          <div className="mt-2 text-[12px] text-mute">
            ID <span className="font-mono text-ink">{sessionId.slice(0, 8)}…</span>
          </div>
        </div>
      </section>

      {/* Summary paragraph — Alex's read */}
      <section
        data-testid="summary-paragraph"
        className="pf-panel mb-10 p-5 sm:p-7 md:p-8"
      >
        <div className="ascii-rule mb-5">Alex&rsquo;s read on your answer</div>

        {loading && (
          <div data-testid="summary-loading" className="space-y-2.5">
            <div className="h-3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-[92%] animate-pulse rounded bg-white/10" />
            <div className="h-3 w-[88%] animate-pulse rounded bg-white/10" />
            <div className="h-3 w-[95%] animate-pulse rounded bg-white/10" />
            <div className="h-3 w-[70%] animate-pulse rounded bg-white/10" />
            <p className="mt-4 text-[13px] text-mute">
              Generating summary. Alex is writing up your feedback.
            </p>
          </div>
        )}
        {!loading && error && (
          <div data-testid="summary-error" role="alert">
            <p className="text-[15px] leading-relaxed text-coral">
              Summary unavailable. Your transcript is still saved below, so
              nothing is lost.
            </p>
            <p className="mt-2 text-[13px] text-mute">{error}</p>
          </div>
        )}
        {!loading && !error && feedback && (
          <>
            {/* Dimension cards — 2x2 grid for 4 dimensions. Categorical
                verdicts only (strong / developing / missing), no scores. */}
            <div
              data-testid="dimension-grid"
              className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {feedback.dimensions.map((dim) => {
                const styles = VERDICT_STYLES[dim.verdict];
                return (
                  <div
                    key={dim.name}
                    data-testid="dimension-card"
                    data-verdict={dim.verdict}
                    className={`pf-verdict-card ${styles.card}`}
                  >
                    <div className="mb-1 text-[11px] uppercase tracking-[0.1em] text-mute">
                      {dim.name}
                    </div>
                    <div
                      className={`mb-1.5 text-[15px] font-semibold leading-none tracking-[-0.01em] ${styles.verdict}`}
                    >
                      <span
                        className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${styles.dot}`}
                      />
                      {styles.label}
                    </div>
                    <p className="text-[12.5px] leading-[1.45] text-ink-2">
                      {dim.observation}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Prose narratives — two paragraphs. */}
            <div data-testid="feedback-prose" className="space-y-5">
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-coral">
                  What worked
                </div>
                <p
                  data-testid="what-worked"
                  className="text-[16px] leading-[1.7] text-ink"
                >
                  {feedback.whatWorked}
                </p>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-coral">
                  What was missed and could have been better
                </div>
                <p
                  data-testid="what-missed"
                  className="text-[16px] leading-[1.7] text-ink"
                >
                  {feedback.whatMissed}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={copySummary}
                className="pf-btn-ghost !text-[12px] text-mute"
              >
                {copied ? "Copied" : "Copy summary"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.08] pt-10 text-center">
        <h2 className="mb-3 font-sans text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink md:text-4xl">
          Run it again
        </h2>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-ink-2">
          The candidates who clear the onsite tend to run this loop a few times
          first. You get a fresh random case and the same Alex.
        </p>
        <Link href="/onboarding/case-select" className="pf-exec-btn">
          Start another session
          <span className="arrow" aria-hidden>
            →
          </span>
        </Link>
        <p className="mt-8 text-[13px] text-mute">
          <Link href="/" className="hover:text-ink">
            Back to homepage
          </Link>
        </p>
      </section>
    </article>
  );
}
