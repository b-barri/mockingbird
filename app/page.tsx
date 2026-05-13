import Link from "next/link";
import { Anatomy } from "@/components/homepage/anatomy";
import { FeatureBlocks } from "@/components/homepage/feature-blocks";
import { Hero } from "@/components/homepage/hero";
import { MeetEmber } from "@/components/homepage/meet-ember";

// R1 + R2 + R3 + R4 + R12: marketing homepage with explicit reading order,
// single primary CTA, no secondary surface. Pre-flight Console direction
// with Ember introduced by name. Renders on every viewport; a small
// mobile-only banner notes that desktop is the recommended surface.

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-cream">
      {/* Mobile-only notice — kept small so it informs without blocking. */}
      <div
        data-testid="desktop-recommended-banner"
        className="border-b border-ink/10 bg-tan/60 px-4 py-2 text-center font-mono text-[11px] tracking-wide text-mute lg:hidden"
      >
        <span className="pulse-dot mr-2 align-middle" />
        Optimized for desktop · works on mobile too
      </div>

      {/* Top brand bar — mono pulse + nav. Nav links hide on mobile so the
          CTA stays reachable; anchor scroll is still possible via the
          section markers themselves. */}
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-baseline gap-3">
            <span className="pulse-dot" />
            <span className="font-mono text-[13px] font-semibold tracking-wide text-ink">
              MOCKINGBIRD
            </span>
          </div>
          <nav className="flex items-center gap-4 text-[13px] sm:gap-7">
            <a
              href="#anatomy"
              className="hidden font-mono text-mute hover:text-ink sm:inline"
            >
              How it goes
            </a>
            <a
              href="#ember"
              className="hidden font-mono text-mute hover:text-ink sm:inline"
            >
              Ember
            </a>
            <Link
              href="/onboarding"
              className="pf-exec-btn !px-3 !py-2 !text-[12px] sm:!px-4"
            >
              <span className="arrow">▸</span>
              Start a session
              <span className="animate-caret-blink text-cream/85" aria-hidden>
                _
              </span>
            </Link>
          </nav>
        </div>
      </header>

      <Hero />

      <Anatomy />

      <FeatureBlocks />

      <MeetEmber />

      <section className="border-t border-ink/[0.08] px-4 py-section text-center sm:px-6 lg:px-8">
        <h2 className="mx-auto max-w-3xl font-display text-3xl leading-[1.05] tracking-tight text-ink md:text-5xl">
          Practice the next loop the way you'll actually run it.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-mute">
          Out loud. Under time. With a probe waiting for the framework you
          forgot.
        </p>
        <div className="mt-10 flex justify-center">
          <Link href="/onboarding" className="pf-exec-btn">
            <span className="arrow">▸</span>
            Deal me a case
            <span className="animate-caret-blink text-cream/85" aria-hidden>
              _
            </span>
          </Link>
        </div>
        <p className="mt-12 text-xs text-mute">
          Built by{" "}
          <a
            href="https://x.com/bhavya_barri"
            className="underline decoration-mute underline-offset-2 hover:text-ink"
          >
            @bhavya_barri
          </a>{" "}
          for the PM corner of the internet.
        </p>
      </section>

      <footer className="border-t border-ink/[0.08]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-2 px-4 py-6 font-mono text-[11px] text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Mockingbird &middot; 2026</span>
          <Link href="/onboarding" className="hover:text-ink">
            Start a session →
          </Link>
        </div>
      </footer>
    </main>
  );
}
