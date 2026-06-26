import Link from "next/link";
import { Anatomy } from "@/components/homepage/anatomy";
import { FeatureBlocks } from "@/components/homepage/feature-blocks";
import { Hero } from "@/components/homepage/hero";
import { MeetEmber } from "@/components/homepage/meet-ember";
import { ScreeningCta } from "@/components/homepage/screening-cta";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";

// R1 + R2 + R3 + R4 + R12: marketing homepage with explicit reading order,
// single primary CTA. Uses the shared shell (SiteHeader/SiteFooter) so chrome
// matches every other route. A small mobile-only banner notes desktop is best.

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {/* Mobile-only notice, kept small so it informs without blocking. */}
      <div
        data-testid="desktop-recommended-banner"
        className="border-b border-white/[0.08] bg-tan/60 px-4 py-2 text-center text-[12px] text-mute lg:hidden"
      >
        <span className="pulse-dot mr-2 align-middle" />
        Best on desktop. Works on mobile too.
      </div>

      <SiteHeader />

      <main className="flex flex-col">
        <Hero />

        <Anatomy />

        <ScreeningCta />

        <FeatureBlocks />

        <MeetEmber />

        <section className="border-t border-white/[0.08] px-4 py-section text-center sm:px-6 lg:px-8">
        <h2 className="mx-auto max-w-3xl font-sans text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink md:text-5xl">
          Practice the next loop the way you'll actually run it.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-2">
          Out loud, under time, with a probe waiting for the framework you
          forgot.
        </p>
        <div className="mt-10 flex justify-center">
          <Link href="/onboarding" className="pf-exec-btn">
            Deal me a case
            <span aria-hidden>→</span>
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
      </main>

      <SiteFooter />
    </div>
  );
}
