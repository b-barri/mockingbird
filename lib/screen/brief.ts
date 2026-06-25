// Company-tailored screening brief — the spine of the screening simulator.
//
// A Brief is produced by the research engine (U2) from the candidate's inputs
// (company, URL, role, JD). It is a readable pre-call artifact AND the source
// of truth that configures both the mock interview and the feedback rubric:
//   - `evalParameters` become the feedback dimensions (U4 — variable count,
//     unlike the product-design path's fixed 4).
//   - `likelyQuestions` + `companySignals` seed the interviewer.
//
// Graceful degradation: when research finds little company-specific signal,
// `hasCompanySignal` is false and individual items are tagged
// `companySpecific: false` so the UI can label generic role/JD prep honestly
// rather than fabricating company detail (origin R4).

/** A question the screen is likely to ask, with why it's likely. */
export interface ScreeningQuestion {
  readonly question: string;
  /** Why this question is likely for this company/role. */
  readonly rationale: string;
  /** true = grounded in a company-specific signal; false = generic role/JD prep. */
  readonly companySpecific: boolean;
}

/**
 * One thing the screen evaluates on. Each becomes a feedback dimension, so the
 * `name` is a short noun phrase (e.g. "Product sense", "Prioritization rigor").
 */
export interface EvalParameter {
  readonly name: string;
  /** What a strong answer on this parameter looks like. */
  readonly description: string;
}

/** A company-specific talking point the candidate should hit. */
export interface CompanySignal {
  readonly point: string;
  readonly companySpecific: boolean;
}

export interface Brief {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly companyUrl?: string;
  /** Likely screening questions for this company/role. */
  readonly likelyQuestions: ReadonlyArray<ScreeningQuestion>;
  /** 3-6 parameters the screen scores on; drive the feedback dimensions. */
  readonly evalParameters: ReadonlyArray<EvalParameter>;
  /** Product knowledge / positioning / recent-launch signals to hit. */
  readonly companySignals: ReadonlyArray<CompanySignal>;
  /** Candidate's likely gaps versus the JD. */
  readonly candidateGaps: ReadonlyArray<string>;
  /**
   * False when research found no meaningful company-specific signal — the brief
   * then degrades to generic role/JD prep and the UI labels it as such.
   */
  readonly hasCompanySignal: boolean;
  readonly generatedAt: number;
}

/**
 * Render the brief's eval parameters as a rubric block for the screening coach
 * prompt. The parameter NAMES become the feedback dimensions, so the lenient
 * parser (lib/screen/feedback.ts) expects exactly `evalParameters.length`
 * dimensions back — not the product-design path's hardcoded 4.
 */
export function briefToRubric(brief: Brief): string {
  const params = brief.evalParameters
    .map((p, i) => `${i + 1}. ${p.name} — ${p.description}`)
    .join("\n");
  const signals = brief.companySignals.length
    ? brief.companySignals.map((s) => `- ${s.point}`).join("\n")
    : "- (no company-specific signal found — judge against the role/JD only)";
  return `Evaluation parameters (score each one as its own dimension, in this order):
${params}

Company signals a strong candidate would reference:
${signals}`;
}

/** The dimension names the feedback must return, in order. */
export function briefDimensionNames(brief: Brief): ReadonlyArray<string> {
  return brief.evalParameters.map((p) => p.name);
}
