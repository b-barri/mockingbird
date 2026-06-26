import Link from "next/link";
import { LoopMockupBody } from "./loop-mockup-body";

// "Anatomy of a session" — three phase cards (prep, the loop, review),
// each with an inline CSS-animated mini-mockup of the destination screen.
// Cards 01 and 02 link to the actual onboarding routes; 03 is informational
// (the review/summary page only exists post-session). Mini-mockups share
// the page's design tokens so palette and font stay consistent.

interface PhaseCardProps {
  num: string;
  tag: string;
  title: string;
  body: string;
  href?: string;
  children: React.ReactNode;
}

function PhaseCard({ num, tag, title, body, href, children }: PhaseCardProps) {
  const cardClass =
    "group flex flex-col rounded-[12px] border border-white/10 bg-tan p-6 transition-all hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55)]";

  const content = (
    <>
      <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-coral">
        {num} &middot; {tag}
      </div>
      <h3 className="mb-2.5 text-2xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-3xl">
        {title}
      </h3>
      <p className="mb-5 text-[13.5px] leading-relaxed text-ink-2">{body}</p>
      <div className="flex flex-1 flex-col rounded-[8px] border border-white/10 bg-raised p-4 text-[11px] leading-[1.6] text-ink">
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${cardClass} no-underline`}>
        {content}
      </Link>
    );
  }
  return (
    <div className={`${cardClass} cursor-default opacity-95`}>{content}</div>
  );
}

export function Anatomy() {
  return (
    <section
      id="anatomy"
      data-testid="anatomy"
      className="mx-auto w-full max-w-[1440px] px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="ascii-rule mb-8 max-w-[680px] sm:mb-10">
        How a session runs
      </div>

      <h2 className="mb-3 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-3xl md:text-4xl">
        Three phases. No warm-up.
      </h2>
      <p className="mb-10 max-w-2xl text-base leading-relaxed text-ink-2 sm:mb-12">
        Click any phase to open the real page. What you see here is exactly what
        runs.
      </p>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Phase 01 — Prep */}
        <PhaseCard
          num="01"
          tag="Prep"
          title="Set up in 30 seconds."
          body="Paste an LLM key, add a voice if you want one. Both get checked before you start. No account, nothing saved on our end."
          href="/onboarding"
        >
          <div className="mb-2 font-semibold tracking-[0.08em] text-coral">
            Step 1 of 2 · Bring your own keys
          </div>
          <div className="mb-1.5 text-ink-2">LLM</div>
          <div className="mb-2.5">
            <span className="mr-1 inline-block rounded-[6px] bg-coral px-1.5 py-px text-white">
              anthropic
            </span>
            <span className="mr-1 inline-block rounded-[6px] border border-white/20 px-1.5 py-px">
              openai
            </span>
          </div>
          <div className="mb-3">
            Anthropic API key{" "}
            <span className="text-coral">● ready</span>
          </div>
          <div className="mb-1.5 text-ink-2">Voice (optional)</div>
          <div>
            <span className="mr-1 inline-block rounded-[6px] bg-coral px-1.5 py-px text-white">
              cartesia
            </span>
            <span className="mr-1 inline-block rounded-[6px] border border-white/20 px-1.5 py-px">
              sarvam
            </span>
          </div>
          <div className="flex-1" />
        </PhaseCard>

        {/* Phase 02 — The loop (animated state machine preview) */}
        <PhaseCard
          num="02"
          tag="The loop"
          title="One case, spoken."
          body="A random Product Design prompt. The interviewer asks, probes, and names the framework you skipped. You answer out loud, not in a text box."
          href="/onboarding/case-select"
        >
          <LoopMockupBody />
        </PhaseCard>

        {/* Phase 03 — Review (informational, no link) */}
        <PhaseCard
          num="03"
          tag="Review"
          title="Receipts, not vibes."
          body="Every 'um' on record. Framework gaps flagged. Token spend itemized. The bill lands on your provider, never on us."
        >
          <div className="mb-2 font-semibold tracking-[0.08em] text-coral">
            Complete · 28:14
          </div>
          <div className="mb-1.5 text-ink-2">Frameworks</div>
          <div>
            CIRCLES&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-coral">✓ hit</span>
          </div>
          <div>
            AARM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-mute">skipped</span>
          </div>
          <div>
            JTBD&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-coral">✓ hit</span>
          </div>
          <div className="mt-3 mb-1.5 text-ink-2">Spend</div>
          <div>LLM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$0.24</div>
          <div>Voice&nbsp;&nbsp;&nbsp;&nbsp;$0.07</div>
          <div className="flex-1" />
        </PhaseCard>
      </div>
    </section>
  );
}
