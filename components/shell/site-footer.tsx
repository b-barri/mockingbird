import Link from "next/link";

// Shared app footer. Consistent across every route except the live session.
export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-2 px-4 py-6 text-[12px] text-mute sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>Mockingbird, 2026</span>
        <Link href="/onboarding" className="hover:text-ink">
          Start a session →
        </Link>
      </div>
    </footer>
  );
}
