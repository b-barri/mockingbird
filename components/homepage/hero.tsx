import Link from "next/link";

// R4 hero discipline: one-sentence value prop + one primary CTA. No
// testimonials, no pricing, no secondary CTA.
export function Hero() {
  return (
    <section
      data-testid="homepage-hero"
      className="flex flex-col items-center px-8 pt-32 pb-section text-center"
    >
      <div className="mb-8 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
        <span className="h-2 w-2 rounded-full bg-coral shadow-[0_0_10px_rgba(232,93,59,0.4)]" />
        Mockingbird
      </div>
      <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-ink md:text-6xl">
        A PM interview prep buddy that talks back — and knows your frameworks.
      </h1>
      <p className="mt-7 max-w-xl text-base leading-relaxed text-mute">
        Voice-first Product Design case practice with framework-aware probes.
        Bring your own API keys. No accounts, no payments.
      </p>
      <Link
        href="/onboarding"
        className="mt-10 inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-ink/85"
      >
        Start a session →
      </Link>
    </section>
  );
}
