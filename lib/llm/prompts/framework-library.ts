// ====================================================================
// DORMANT AS OF 2026-05-12.
//
// This library is no longer injected into the interviewer system prompt.
// Mid-session probes flow from natural interviewer curiosity (see
// persona-google-meta-pm.ts), and post-session feedback grounds in each
// case's evalRubric (see case-templates/product-design.ts) — not in this
// framework data.
//
// The file is retained as silent reference: the data shape may be useful
// scaffolding if future case types (Strategy, Growth, Metrics) want a
// structured probe library, and the existing operator-private-framework
// system (lib/auth/private-frameworks.ts) still imports the types.
//
// See: docs/plans/2026-05-12-001-feat-tension-grounded-feedback-plan.md (U4)
// ====================================================================

// Public PM framework library. The interviewer LLM was previously "aware" of
// these frameworks via the system prompt. R14 said when the candidate skipped
// a load-bearing step, the AI asked the matching probe — not a feedback
// statement ("you skipped X"). That wiring is removed; the data persists for
// reference.
//
// The operator can override this library with private content via
// OPERATOR_PRIVATE_FRAMEWORKS env-var per R21 (see lib/auth/private-frameworks.ts).

export interface FrameworkStep {
  /** Single-letter or short code (CIRCLES → "C", "I", "R", etc.). */
  readonly id: string;
  /** Human-readable step name. */
  readonly name: string;
  /** Probe question the interviewer asks when this step is skipped. */
  readonly probe: string;
  /** One-line description of what this step is for. */
  readonly purpose: string;
}

export interface FrameworkSpec {
  readonly name: string;
  /** Acronym expansion or full name. */
  readonly expansion: string;
  /** When to reach for this framework. */
  readonly bestFor: string;
  readonly steps: ReadonlyArray<FrameworkStep>;
}

export const PUBLIC_FRAMEWORKS: ReadonlyArray<FrameworkSpec> = [
  {
    name: "CIRCLES",
    expansion: "Customer · Insight · Report Needs · Cut · List · Evaluate · Summarize",
    bestFor: "Product Design questions (Design X for Y).",
    steps: [
      {
        id: "C",
        name: "Customer",
        purpose: "Identify the target user precisely.",
        probe: "Who exactly are we designing for here — what specific segment?",
      },
      {
        id: "I",
        name: "Insight",
        purpose: "Surface the deeper truth about that user's situation.",
        probe: "What's the underlying insight about this user that the obvious framing misses?",
      },
      {
        id: "R",
        name: "Report Needs",
        purpose: "Enumerate the needs, not the solutions.",
        probe: "Before we get to solutions — what needs are you prioritizing for this user, and why those?",
      },
      {
        id: "Cut",
        name: "Cut Down",
        purpose: "Pick the few needs that matter most.",
        probe: "Of those needs, which ones are you cutting away and why?",
      },
      {
        id: "L",
        name: "List Solutions",
        purpose: "Generate solution candidates.",
        probe: "What are 2-3 distinct ways you could address that?",
      },
      {
        id: "E",
        name: "Evaluate",
        purpose: "Apply criteria to compare candidates.",
        probe: "How are you deciding between those? What's your evaluation criteria?",
      },
      {
        id: "S",
        name: "Summarize",
        purpose: "Land on a clear recommendation and trade-offs.",
        probe: "Where did you land overall — and what are you accepting in trade?",
      },
    ],
  },
  {
    name: "AARM",
    expansion: "Acquisition · Activation · Retention · Monetization",
    bestFor: "Growth and strategy questions; analyzing product health.",
    steps: [
      {
        id: "A1",
        name: "Acquisition",
        purpose: "How do new users find this product?",
        probe: "How are new users discovering this in the first place?",
      },
      {
        id: "A2",
        name: "Activation",
        purpose: "What's the first valuable action a new user takes?",
        probe: "What's the first action that delivers value — and when does that fire?",
      },
      {
        id: "R",
        name: "Retention",
        purpose: "Why do users come back?",
        probe: "Why does a user come back next week or next month?",
      },
      {
        id: "M",
        name: "Monetization",
        purpose: "How does the product capture value?",
        probe: "Where does revenue actually come from, and what's the unit economics?",
      },
    ],
  },
  {
    name: "Goals-Signals-Metrics",
    expansion: "Goals → Signals → Metrics",
    bestFor: "Metrics design and measurement questions.",
    steps: [
      {
        id: "G",
        name: "Goals",
        purpose: "What outcome do we want?",
        probe: "What's the user outcome you actually want to drive — not the product output?",
      },
      {
        id: "S",
        name: "Signals",
        purpose: "What observable behavior indicates the goal is being met?",
        probe: "What observable user behavior would prove that goal is being met?",
      },
      {
        id: "M",
        name: "Metrics",
        purpose: "How do we measure the signal at scale?",
        probe: "How would you measure that signal across millions of users?",
      },
    ],
  },
];

/** Render the framework library as a prompt section. */
export function renderFrameworkLibrary(
  frameworks: ReadonlyArray<FrameworkSpec>
): string {
  return frameworks
    .map((fw) => {
      const stepLines = fw.steps
        .map(
          (s) => `  - ${s.name} (${s.id}): ${s.purpose}\n    Probe if skipped: "${s.probe}"`
        )
        .join("\n");
      return `## ${fw.name}\n${fw.expansion}\nBest for: ${fw.bestFor}\nSteps:\n${stepLines}`;
    })
    .join("\n\n");
}
