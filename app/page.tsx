import Link from "next/link";
import { DemoVideo } from "@/components/homepage/demo-video";
import { FeatureBlocks } from "@/components/homepage/feature-blocks";
import { Hero } from "@/components/homepage/hero";
import { MobileGate } from "@/components/homepage/mobile-gate";

// R1 + R2 + R3 + R4 + R12: marketing homepage with explicit reading order,
// CSS-gated mobile interstitial, single primary CTA, no secondary surface.

export default function HomePage() {
  return (
    <>
      {/* Mobile interstitial — visible only below lg (1024px) breakpoint */}
      <MobileGate />

      {/* Desktop homepage — visible at lg and up */}
      <main className="hidden min-h-screen flex-col bg-cream lg:flex">
        <Hero />
        <DemoVideo />
        <FeatureBlocks />
        <section className="border-t border-ink/[0.08] px-8 py-section text-center">
          <h2 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
            Practice the next interview the way you'd actually run it.
          </h2>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-cream hover:bg-ink/85"
          >
            Start a session →
          </Link>
          <p className="mt-12 text-xs text-mute">
            Brought to you by{" "}
            <a
              href="https://x.com/bhavya_barri"
              className="underline decoration-mute underline-offset-2 hover:text-ink"
            >
              @bhavya_barri
            </a>
            . Built for PM/AI Twitter.
          </p>
        </section>
      </main>
    </>
  );
}
