import Link from "next/link";
import { LoopMockupBody } from "./loop-mockup-body";

// "Anatomy of a Session" — three phase cards (PREP / THE LOOP / REVIEW)
// each with an inline CSS-animated mini-mockup of the destination screen.
// Cards 01 and 02 link to the actual onboarding routes; 03 is informational
// (the review/summary page only exists post-session). Mini-mockups share
// the page's design tokens so palette/font stays consistent.

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
    "group flex flex-col rounded-lg border border-ink/10 bg-cream p-6 transition-all hover:-translate-y-1 hover:border-ink hover:shadow-[0_24px_48px_-24px_rgba(26,22,18,0.30)]";

  const content = (
    <>
      <div className="mb-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-coral">
        {num} &middot; {tag}
      </div>
      <h3 className="mb-2.5 font-display text-2xl leading-[1.05] tracking-tight text-ink md:text-3xl">
        {title}
      </h3>
      <p className="mb-5 text-[13.5px] leading-relaxed text-mute">{body}</p>
      <div className="flex flex-1 flex-col rounded-md border border-ink/10 bg-tan p-4 font-mono text-[10.5px] leading-[1.55] text-ink">
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
        ── ANATOMY OF A SESSION ─────────────────────────────────
      </div>

      <h2 className="mb-3 max-w-2xl font-display text-2xl leading-tight tracking-tight text-ink sm:text-3xl md:text-4xl">
        Three phases. One real loop.
      </h2>
      <p className="mb-10 max-w-2xl text-base leading-relaxed text-mute sm:mb-12">
        Click any phase for the page itself. Same copy you'll see in the
        product, same tokens, same voice.
      </p>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Phase 01 — PREP */}
        <PhaseCard
          num="01"
          tag="PREP"
          title="Pre-flight setup."
          body="Paste your LLM key, pick a voice provider (optional). Validated synchronously before you advance. 30 seconds, tops."
          href="/onboarding"
        >
          <div className="mb-2 font-semibold tracking-[0.12em] text-coral">
            [STEP 1/2] BYO_KEYS
          </div>
          <div className="mb-1.5 text-ink/40">── LLM ──────────────────</div>
          <div className="mb-2.5">
            <span className="mr-1 inline-block rounded-[2px] bg-ink px-1.5 py-px text-cream">
              anthropic
            </span>
            <span className="mr-1 inline-block rounded-[2px] border border-ink/20 px-1.5 py-px">
              openai
            </span>
          </div>
          <div className="mb-3">
            ANTHROPIC_API_KEY{" "}
            <span className="text-coral">● READY</span>
          </div>
          <div className="mb-1.5 text-ink/40">── VOICE ─── [OPTIONAL]</div>
          <div>
            <span className="mr-1 inline-block rounded-[2px] bg-ink px-1.5 py-px text-cream">
              cartesia
            </span>
            <span className="mr-1 inline-block rounded-[2px] border border-ink/20 px-1.5 py-px">
              sarvam
            </span>
          </div>
          <div className="flex-1" />
        </PhaseCard>

        {/* Phase 02 — THE LOOP (animated state machine preview) */}
        <PhaseCard
          num="02"
          tag="THE LOOP"
          title="30 minutes, out loud."
          body="One random Product Design case. Alex asks, probes, calls out the framework you skipped. You answer with your voice."
          href="/onboarding/case-select"
        >
          <LoopMockupBody />
        </PhaseCard>

        {/* Phase 03 — REVIEW (informational, no link) */}
        <PhaseCard
          num="03"
          tag="REVIEW"
          title="Transcript & receipts."
          body="Every 'um' captured. Framework gaps highlighted. Token spend named. The bill landed on your provider, not ours."
        >
          <div className="mb-2 font-semibold tracking-[0.12em] text-coral">
            [COMPLETE] 28:14
          </div>
          <div className="mb-1.5 text-ink/40">── FRAMEWORKS ──────────</div>
          <div>
            CIRCLES&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-coral">✓ hit</span>
          </div>
          <div>
            AARM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-mute">— skipped</span>
          </div>
          <div>
            JTBD&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-coral">✓ hit</span>
          </div>
          <div className="mt-3 mb-1.5 text-ink/40">── SPEND ───────────────</div>
          <div>LLM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$0.24</div>
          <div>VOICE&nbsp;&nbsp;&nbsp;&nbsp;$0.07</div>
          <div className="flex-1" />
        </PhaseCard>
      </div>
    </section>
  );
}
