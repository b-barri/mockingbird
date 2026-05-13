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
      className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-4 pt-12 pb-section sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-24"
    >
      <div>
        <div className="mb-5 flex items-center gap-2.5 font-mono text-[12px] tracking-wide text-coral sm:mb-6">
          <span className="pulse-dot" />
          <span>&gt; mockingbird_</span>
        </div>

        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
          A PM interview buddy that pressure-tests your answer the way a real
          panel would.
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-mute sm:mt-7">
          Real Product Design cases, out loud, with an interviewer who pushes
          on the moves you'd rather move past. BYO API key. No accounts, no
          payments, no "book a demo."
        </p>

        <div className="mt-8 flex flex-col items-start gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-6">
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
