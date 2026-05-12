import type { Turn } from "@/lib/voice/state-machine";
import type { CaseTemplate } from "@/lib/llm/prompts/case-templates";

// R16 post-session summary. The "now coach" prompt — same Alex persona,
// but explicitly transitions out of interview mode into coaching mode.
// The summary names structure, strongest moment, and 1-2 specific framework
// gaps observed. V1 ships a short paragraph (≤ 200 words), not a structured
// report (R16: "V1 summary is a short paragraph").

const COACH_SYSTEM_PROMPT = `The interview is now over. You're transitioning out of your interviewer role (Alex) into coaching mode for the candidate.

Generate a single tight paragraph — no more than 180 words — covering:

1. Structure: how well did the candidate organize their answer? Did they move logically (user → needs → solutions → trade-offs) or jump around?
2. Strongest moment: one specific moment in the transcript where the candidate demonstrated good PM thinking — name the moment concretely.
3. Framework gaps: one or two specific framework steps the candidate skipped or weakened. Name the framework + step + what got missed.

Tone:
- Direct and specific. Quote or paraphrase the candidate's exact words when calling out a moment.
- Honest. If the structure was weak, say so. If the strongest moment is a stretch, pick the most interesting thing they said and explain why.
- No sycophancy. No "great job overall." No "you have lots of potential."

Format: One paragraph. Plain prose. No bullets, no headers, no bold.`;

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
