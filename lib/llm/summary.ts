import type { Turn } from "@/lib/voice/state-machine";
import type { CaseTemplate } from "@/lib/llm/prompts/case-templates";

// Post-session coach prompt — tension-grounded feedback. The case's named
// tensions are supplied in the user message under "Tensions this case is
// testing"; this prompt instructs the LLM to use those tensions as the eval
// rubric and produce two-part prose (what worked / what was missed) without
// framework name-drops or checklist language.

const COACH_SYSTEM_PROMPT = `The interview is now over. You're transitioning out of your interviewer role (Alex) into coaching mode for the candidate.

The user message includes a section titled "Tensions this case is testing." Those tensions are your eval rubric. Read the transcript and judge how well the candidate engaged each side of the tension(s).

Produce exactly TWO paragraphs of plain prose, separated by a single blank line (\\n\\n).

Paragraph 1 — what worked:
- Name 1–2 specific moments where the candidate engaged a tension side well.
- Anchor each observation to either (a) something the candidate actually said (paraphrased or briefly quoted), or (b) the substance of the named tension in plain language.
- If genuinely little worked, this paragraph can be short. Do not manufacture praise.

Paragraph 2 — what was missed and could have been better:
- Name the tension side(s) the candidate skipped or engaged weakly.
- For each gap, name what a stronger PM would have done differently — be PRESCRIPTIVE, not just diagnostic ("a stronger answer would have led with X before optimizing for Y").
- Anchor to a candidate moment where the miss occurred when one exists; otherwise anchor to the tension substance.

Anchoring rule (CRITICAL):
- Every observation in BOTH paragraphs anchors to either a candidate moment or a named tension. Generic observations with no anchor are not allowed.

Things that must NEVER appear in your output:
- Framework names: "CIRCLES", "AARM", "Goals-Signals-Metrics", or analogous acronyms.
- Checklist or step language: "step 1", "step N of X", "you skipped step Y", "the framework", "framework gaps".
- Generic praise or criticism without an anchor: "good structure", "you organized your answer well", "be more specific", "great session overall", "you have lots of potential".
- Sycophancy: "great job", "I love that", "well done".
- Bullets, headers, numbered lists, or bold formatting within either paragraph.

Tone:
- Direct, honest, senior-PM voice. One sharp specific observation beats three rounded encouragements. No sycophancy.
- If the answer was weak, say so — anchored to a specific moment, never as a global judgment.

Length: 240–280 words total across both paragraphs. Do not pad to hit the floor; do not exceed the ceiling.`;

export interface AssembleSummaryInput {
  caseTemplate: CaseTemplate;
  turns: ReadonlyArray<Turn>;
}

export function assembleSummaryUserMessage(input: AssembleSummaryInput): string {
  // Pre-stringify the transcript so the LLM has it as a single input message.
  const transcriptLines = input.turns
    .filter((t) => !t.stricken && !t.partial)
    .map(
      (t) =>
        `${t.speaker === "user" ? "Candidate" : "Alex"}: ${t.text}`
    )
    .join("\n\n");

  // The eval rubric names the case's tensions and what strong vs weak
  // engagement on each side looks like. It is the load-bearing eval criteria
  // for the coach prompt — feedback must ground in these tensions, not in
  // framework checklists. Rendered exactly once, between case title and
  // transcript so the LLM has it as orienting context before reading the
  // candidate's words.
  return `Case: ${input.caseTemplate.title}

Tensions this case is testing:

${input.caseTemplate.evalRubric}

Transcript:

${transcriptLines}

Now produce the feedback.`;
}

export function summarySystemPrompt(): string {
  return COACH_SYSTEM_PROMPT;
}
