import { PrepForm } from "@/components/screen/prep-form";

// U1: screening-prep entry. The candidate enters the company, role, URL, and
// JD; research builds a tailored brief on submit.

export default function ScreenPrepPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-section sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
      <div className="mb-4 font-mono text-[11px] tracking-wide text-coral">
        [SCREEN_PREP]&nbsp;&nbsp;TAILORED · COMPANY_SPECIFIC
      </div>

      <h1 className="mb-3 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
        Prep for the
        <br />
        AI screen.
      </h1>

      <p className="mb-8 max-w-[520px] font-mono text-[13px] leading-relaxed text-mute sm:mb-10 sm:text-[14px]">
        // tell us where you&apos;re interviewing. we research the company and build
        a brief of likely questions, what they score on, and your gaps.
      </p>

      <PrepForm />
    </main>
  );
}
