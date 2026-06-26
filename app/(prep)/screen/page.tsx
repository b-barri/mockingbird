import { PrepForm } from "@/components/screen/prep-form";
import { AppContainer } from "@/components/shell/app-container";

// Screening prep entry. The candidate enters the company, role, URL, and JD;
// research builds a tailored brief on submit.

export default function ScreenPrepPage() {
  return (
    <AppContainer>
      <div className="ascii-rule mb-4">Screen prep</div>

      <h1 className="mb-3 text-4xl font-semibold leading-[1.05] tracking-[-0.022em] text-ink sm:text-5xl">
        Prep for the AI screen.
      </h1>

      <p className="mb-8 max-w-[520px] text-[14px] leading-relaxed text-ink-2 sm:mb-10">
        Tell us where you&apos;re interviewing. We research the company and build a
        brief of likely questions, what they score on, and where your gaps are.
      </p>

      <PrepForm />
    </AppContainer>
  );
}
