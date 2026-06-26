import Image from "next/image";
import Link from "next/link";

// Hero discipline: one-sentence value prop + one primary CTA. No testimonials,
// no pricing, no secondary CTA. Linear direction: a quiet pill eyebrow, a tight
// Inter headline, a clean filled CTA, and the Ember + PM lamplight image on the
// right (the warm halo keeps it native against the near-black surface).
export function Hero() {
  return (
    <section
      data-testid="homepage-hero"
      className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-4 pt-12 pb-section sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-24"
    >
      <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-ink-2 sm:mb-7">
          <span className="pulse-dot" />
          <span>Mockingbird</span>
        </div>

        <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.022em] text-ink sm:text-5xl md:text-6xl">
          An AI mock interviewer that pushes back, built for PMs.
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:mt-7">
          Practice real Product Design cases out loud. The interviewer probes
          the soft spot in your answer instead of nodding along, then scores you
          the second you hang up. Bring your own API key. No account, no
          paywall, no "book a demo."
        </p>

        <div className="mt-8 flex flex-col items-start gap-4 sm:mt-10 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/onboarding" className="pf-exec-btn">
            Deal me a case
            <span aria-hidden>→</span>
          </Link>
          <span className="max-w-[260px] text-[13px] leading-relaxed text-mute">
            One random case, 30 minutes. You&apos;ll know where you stand in
            about 12.
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
          className="w-full rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.08]"
        />
        <p className="mt-3 text-center text-[13px] text-mute">
          Ember and you, by lamplight.
        </p>
      </div>
    </section>
  );
}
