"use client";

import type { Brief } from "@/lib/screen/brief";

// Brief display. Renders the company-tailored prep brief as a readable pre-call
// artifact, visually distinguishing company-specific items (coral "company" tag)
// from generic role/JD prep (muted "generic" tag). When research found no
// company-specific signal, a banner says so honestly (origin R4).

function Tag({ companySpecific }: { companySpecific: boolean }) {
  return companySpecific ? (
    <span className="ml-2 rounded-[6px] bg-coral/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-coral">
      company
    </span>
  ) : (
    <span className="ml-2 rounded-[6px] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mute">
      generic
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="pf-panel p-4 sm:p-6">
      <div className="ascii-rule mb-4">{label}</div>
      {children}
    </section>
  );
}

export function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="space-y-5" data-testid="brief-view">
      <header>
        <div className="ascii-rule mb-2">
          {brief.company} · {brief.role}
        </div>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.022em] text-ink sm:text-5xl">
          Your screening brief.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          Read this, then take the live screen with your interviewer below when
          you&apos;re ready.
        </p>
      </header>

      {!brief.hasCompanySignal && (
        <p
          role="status"
          className="rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-ink-2"
        >
          We didn&apos;t find strong company-specific signal, so this is tailored
          role and JD prep rather than invented company detail.
        </p>
      )}

      <Section label="Likely questions">
        <ul className="space-y-4">
          {brief.likelyQuestions.map((q, i) => (
            <li key={i} className="border-l-2 border-white/12 pl-3">
              <p className="text-[15px] leading-relaxed text-ink">
                {q.question}
                <Tag companySpecific={q.companySpecific} />
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-mute">{q.rationale}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="What they score">
        <ul className="space-y-2">
          {brief.evalParameters.map((p, i) => (
            <li key={i} className="text-[15px] leading-relaxed text-ink">
              <span className="font-medium">{p.name}</span>
              <span className="text-mute">. {p.description}</span>
            </li>
          ))}
        </ul>
      </Section>

      {brief.companySignals.length > 0 && (
        <Section label="Signals to hit">
          <ul className="space-y-2">
            {brief.companySignals.map((s, i) => (
              <li key={i} className="text-[15px] leading-relaxed text-ink">
                {s.point}
                <Tag companySpecific={s.companySpecific} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section label="Your likely gaps">
        <ul className="space-y-1.5">
          {brief.candidateGaps.map((g, i) => (
            <li key={i} className="text-[15px] leading-relaxed text-ink-2">
              {g}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
