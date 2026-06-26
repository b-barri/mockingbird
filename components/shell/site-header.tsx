import Link from "next/link";

// Shared app header. The only nav in the app today is inline on the homepage;
// this extracts it into one consistent shell used across marketing, onboarding,
// screen, brief, and summary. The live session keeps its own slim in-session bar.
// Nav is route-based (works on every page) and reflects both practice modes.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-cream/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2.5 no-underline">
          <span className="pulse-dot" />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Mockingbird
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-[13px] sm:gap-7">
          <Link
            href="/onboarding"
            className="hidden text-mute hover:text-ink sm:inline"
          >
            Practice
          </Link>
          <Link
            href="/screen"
            className="hidden text-coral hover:text-ink sm:inline"
          >
            Screening
            <span className="ml-1.5 rounded-[6px] bg-coral px-1 py-px text-[9px] uppercase tracking-wide text-white">
              new
            </span>
          </Link>
          <Link href="/onboarding" className="pf-exec-btn !px-3 !py-2 !text-[12px] sm:!px-4">
            Start a session
          </Link>
        </nav>
      </div>
    </header>
  );
}
