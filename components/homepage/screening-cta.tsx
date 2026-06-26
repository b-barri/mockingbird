import Link from "next/link";

// Homepage add-on: the Company Screening Simulator, framed as a second way to
// practice alongside open-ended cases. Cases keep you sharp in general; this is
// for a specific job. The interviewer's voice is powered by Ringg AI (an engine,
// not a character). Tight Inter headline, secondary reading text, the coral
// pf-exec-btn primary, rationed coral, surfaces and hairlines.
export function ScreeningCta() {
  return (
    <section
      id="screening"
      data-testid="screening-cta"
      className="mx-auto w-full max-w-[1440px] px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="ascii-rule mb-8 max-w-[680px] sm:mb-10">
        Company screen
      </div>

      <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-16">
        <div>
          <div className="mb-4 text-[11px] uppercase tracking-[0.14em] text-coral">
            Have a real screen coming up?
          </div>
          <h2 className="text-4xl font-semibold leading-[1.04] tracking-[-0.022em] text-ink sm:text-5xl">
            Rehearse that exact one.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2">
            Cases keep you sharp in general. This is for the job in front of you.
            Name the company and role, paste the JD, and Mockingbird researches
            how <em>they</em> actually screen, then runs it as a live voice call
            and scores how you came across.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/screen" className="pf-exec-btn">
              Build my screen
              <span aria-hidden>→</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.06em] text-mute">
              Live voice by <span className="text-coral">Ringg AI</span>
            </span>
          </div>
          <p className="mt-4 text-[12px] text-mute">
            Same bring-your-own key, same out-loud format, tuned to one company.
          </p>
        </div>

        {/* Setup preview — the real intake fields, read-only as a teaser. */}
        <div className="pf-panel p-5 sm:p-6">
          <div className="ascii-rule mb-4">Target</div>
          <div className="space-y-4">
            <PreviewField label="Company *" value="Stripe" />
            <PreviewField label="Company website (optional)" value="https://stripe.com" muted />
            <PreviewField label="Role *" value="Product Manager" />
            <PreviewField
              label="Job description *"
              value="Paste the JD. The more detail, the sharper the questions."
              muted
            />
            <Link
              href="/screen"
              className="pf-exec-btn w-full justify-start"
            >
              Build my screen
              <span aria-hidden>→</span>
            </Link>
            <p className="text-center text-[10px] text-mute">
              Bring your own Anthropic key · about 6 min · scored right after
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewField({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-mute">
        {label}
      </div>
      <div
        className={`mt-1 w-full rounded-[8px] border border-white/12 bg-raised px-3 py-2.5 text-[14px] ${
          muted ? "text-mute" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
