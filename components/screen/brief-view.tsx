"use client";

import type { Brief } from "@/lib/screen/brief";

// U3: brief display. Renders the company-tailored prep brief as a readable
// pre-call artifact, visually distinguishing company-specific items (coral
// "company" tag) from generic role/JD prep (muted "generic" tag). When research
// found no company-specific signal, a banner says so honestly (origin R4).

function Tag({ companySpecific }: { companySpecific: boolean }) {
  return companySpecific ? (
    <span className="ml-2 rounded-[2px] bg-coral/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-coral">
      company
    </span>
  ) : (
    <span className="ml-2 rounded-[2px] bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute">
      generic
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="pf-panel p-4 sm:p-6">
      <div className="ascii-rule mb-4">── {label} ──────────────────────────────</div>
      {children}
    </section>
  );
}

export function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="space-y-5" data-testid="brief-view">
      <header>
        <div className="mb-2 font-mono text-[11px] tracking-wide text-coral">
          [PREP_BRIEF]&nbsp;&nbsp;{brief.company.toUpperCase()} · {brief.role.toUpperCase()}
        </div>
        <h1 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
          Your screening brief.
        </h1>
      </header>

      {!brief.hasCompanySignal && (
        <p
          role="status"
          className="rounded-[3px] border border-ink/20 bg-cream px-3 py-2 font-mono text-[12px] text-mute"
        >
          // no strong company-specific signal found — this is tailored role &amp; JD
          prep, not invented company detail.
        </p>
      )}

      <Section label="LIKELY_QUESTIONS">
        <ul className="space-y-3">
          {brief.likelyQuestions.map((q, i) => (
            <li key={i} className="border-l-2 border-ink/15 pl-3">
              <p className="font-mono text-[13px] text-ink">
                {q.question}
                <Tag companySpecific={q.companySpecific} />
              </p>
              <p className="mt-1 font-mono text-[11px] text-mute">{q.rationale}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="WHAT_THEY_SCORE">
        <ul className="space-y-2">
          {brief.evalParameters.map((p, i) => (
            <li key={i} className="font-mono text-[13px] text-ink">
              <span className="text-coral">▸</span> {p.name}
              <span className="text-mute"> — {p.description}</span>
            </li>
          ))}
        </ul>
      </Section>

      {brief.companySignals.length > 0 && (
        <Section label="SIGNALS_TO_HIT">
          <ul className="space-y-2">
            {brief.companySignals.map((s, i) => (
              <li key={i} className="font-mono text-[13px] text-ink">
                {s.point}
                <Tag companySpecific={s.companySpecific} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section label="YOUR_LIKELY_GAPS">
        <ul className="space-y-1">
          {brief.candidateGaps.map((g, i) => (
            <li key={i} className="font-mono text-[13px] text-ink">
              <span className="text-mute">·</span> {g}
            </li>
          ))}
        </ul>
      </Section>

      <div className="pf-panel p-4 sm:p-6">
        <div className="ascii-rule mb-3">── MOCK_SCREEN ───────────────────────────</div>
        <p className="font-mono text-[12px] text-mute">
          // the live phone screen (Ringg) lands once telephony is wired. for now,
          rehearse against this brief.
        </p>
      </div>
    </div>
  );
}
