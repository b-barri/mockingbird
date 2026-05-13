import Image from "next/image";
import Link from "next/link";

// R4 hero discipline: one-sentence value prop + one primary CTA. No
// testimonials, no pricing, no secondary CTA. Pre-flight Console direction:
// mono eyebrow, big serif headline, plain-English CTA in mono dark button,
// Ember + PM lamplight image with brand halo on the right.
export function Hero() {
  return (
    <section
      data-testid="homepage-hero"
      className="mx-auto grid w-full max-w-[1440px] grid-cols-[1.05fr_1fr] items-center gap-16 px-8 pt-24 pb-section"
    >
      <div>
        <div className="mb-6 flex items-center gap-2.5 font-mono text-[12px] tracking-wide text-coral">
          <span className="pulse-dot" />
          <span>&gt; mockingbird_</span>
        </div>

        <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl">
          A PM interview buddy that pressure-tests your answer the way a real
          panel would.
        </h1>

        <p className="mt-7 max-w-xl text-base leading-relaxed text-mute">
          Real Product Design cases, out loud, with an interviewer who pushes
          on the moves you'd rather move past. BYO API key. No accounts, no
          payments, no "book a demo."
        </p>

        <div className="mt-10 flex items-center gap-6">
          <Link href="/onboarding" className="pf-exec-btn">
            <span className="arrow">▸</span>
            Deal me a case
            <span className="animate-caret-blink text-cream/85" aria-hidden>
              _
            </span>
          </Link>
          <span className="max-w-[260px] font-mono text-[11px] leading-relaxed text-mute">
            30 minutes. One random case.
            <br />
            You'll know if you're ready in about 12.
          </span>
        </div>
      </div>

      <div className="brand-image-glow w-full">
        <Image
          src="/branding/hero_image.png"
          alt="Ember sitting next to a curly-haired PM working on a laptop by lamplight"
          width={1200}
          height={510}
          priority
          className="w-full rounded-2xl shadow-[0_30px_60px_-20px_rgba(26,22,18,0.45)] ring-1 ring-ink/[0.08]"
        />
        <p className="mt-3 text-center font-mono text-[11px] text-mute">
          // ember + you, by lamplight.
        </p>
      </div>
    </section>
  );
}
