import type { Turn } from "@/lib/voice/state-machine";
import type { CaseTemplate } from "@/lib/llm/prompts/case-templates";

// Post-session coach prompt — tension-grounded structured feedback.
//
// As of the 2026-05-13 amendment, the output is structured JSON rather than
// free prose. Each session produces 4 dimension assessments (Customer focus,
// Structure, and two case-specific tension sides derived from the case's
// evalRubric) with categorical verdicts (strong / developing / missing) plus
// two prose paragraphs (what worked / what was missed). Numeric scores remain
// out of scope per the brainstorm.

export type DimensionVerdict = "strong" | "developing" | "missing";

export interface DimensionAssessment {
  readonly name: string;
  readonly verdict: DimensionVerdict;
  readonly observation: string;
}

export interface StructuredFeedback {
  readonly dimensions: ReadonlyArray<DimensionAssessment>;
  readonly whatWorked: string;
  readonly whatMissed: string;
}

const COACH_SYSTEM_PROMPT = `You are Alex — the interviewer the candidate just finished a session with. The interview is over and you are now in coach mode, evaluating their performance.

The user message includes:
- The case title
- A section titled "Tensions this case is testing" with the case's eval rubric
- The session transcript

Use the eval rubric to identify the case's named tension sides. Read the transcript. Judge how well the candidate engaged each side.

OUTPUT FORMAT: Return ONLY a single JSON object matching this exact schema. No preamble, no markdown code fence, no trailing explanation — just the JSON object as the entire response.

{
  "dimensions": [
    {"name": "Customer focus", "verdict": "<strong|developing|missing>", "observation": "<10-20 words>"},
    {"name": "Structure", "verdict": "<strong|developing|missing>", "observation": "<10-20 words>"},
    {"name": "<First tension side from the rubric as a short noun phrase, e.g., 'Engagement side'>", "verdict": "<strong|developing|missing>", "observation": "<10-20 words>"},
    {"name": "<Second tension side from the rubric as a short noun phrase, e.g., 'Harm side'>", "verdict": "<strong|developing|missing>", "observation": "<10-20 words>"}
  ],
  "whatWorked": "<one paragraph, 100-140 words>",
  "whatMissed": "<one paragraph, 100-140 words>"
}

Constraints on structure:
- Always exactly 4 dimensions, in the order above: Customer focus, Structure, then two case-tension sides derived from the rubric.
- The two case-tension dimensions are named after the actual tension sides the case is testing (extract from the "Tensions this case is testing" section). For example, an engagement-vs-harm case might use "Engagement side" and "Harm side"; a passenger-trust-vs-driver-economics case might use "Passenger trust" and "Driver economics".
- Each verdict is exactly one of these three strings: "strong", "developing", "missing". No other vocabulary.

Constraints on content:
- Each observation is 10-20 words. Anchor it to a candidate moment (paraphrased or briefly quoted) OR to the tension substance in plain language.
- whatWorked + whatMissed together total 240-280 words; each individual paragraph is 100-140 words.
- whatWorked can be shorter if genuinely little worked — do not manufacture praise.
- whatMissed is prescriptive: name what a stronger PM would have done differently ("a stronger answer would have led with X before optimizing for Y"), not just diagnostic ("you didn't address Y").

Things that must NEVER appear in any field (observation, whatWorked, or whatMissed):
- Framework names: "CIRCLES", "AARM", "Goals-Signals-Metrics", or any analogous acronym.
- Checklist or step language: "step 1", "step N of X", "you skipped step Y", "the framework", "framework gaps".
- Generic praise or criticism without an anchor: "good structure", "you organized your answer well", "be more specific", "great session overall", "you have lots of potential".
- Sycophancy: "great job", "I love that", "well done".
- Numeric scores, percentages, ordinal ratings of any kind. Categorical verdicts only.

Tone:
- Direct, honest, senior-PM voice. One sharp specific observation beats three rounded encouragements. No sycophancy.
- If the answer was weak, say so — anchored to a specific moment, never as a global judgment.`;

export interface AssembleSummaryInput {
  caseTemplate: CaseTemplate;
  turns: ReadonlyArray<Turn>;
}

export function assembleSummaryUserMessage(input: AssembleSummaryInput): string {
  const transcriptLines = input.turns
    .filter((t) => !t.stricken && !t.partial)
    .map(
      (t) =>
        `${t.speaker === "user" ? "Candidate" : "Alex"}: ${t.text}`
    )
    .join("\n\n");

  return `Case: ${input.caseTemplate.title}

Tensions this case is testing:

${input.caseTemplate.evalRubric}

Transcript:

${transcriptLines}

Now produce the feedback as JSON.`;
}

export function summarySystemPrompt(): string {
  return COACH_SYSTEM_PROMPT;
}

// Server-side parsing of the LLM JSON response. Tolerant to a markdown code
// fence wrapper (some Claude responses wrap JSON in ```json ... ```), but
// strict on the schema once parsed. Throws on any structural mismatch so the
// route can surface a clean error to the client.
const VALID_VERDICTS: ReadonlySet<DimensionVerdict> = new Set([
  "strong",
  "developing",
  "missing",
]);

export function parseFeedback(raw: string): StructuredFeedback {
  const trimmed = raw.trim();
  // Strip optional markdown code fence (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonStr = fenceMatch ? fenceMatch[1] : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Could not parse feedback as JSON: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Feedback JSON must be an object");
  }
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.dimensions)) {
    throw new Error("Feedback JSON must have a 'dimensions' array");
  }
  if (obj.dimensions.length !== 4) {
    throw new Error(
      `Feedback JSON must have exactly 4 dimensions; got ${obj.dimensions.length}`
    );
  }
  const dimensions: DimensionAssessment[] = obj.dimensions.map(
    (d: unknown, idx: number) => {
      if (!d || typeof d !== "object") {
        throw new Error(`Dimension ${idx} is not an object`);
      }
      const dim = d as Record<string, unknown>;
      if (typeof dim.name !== "string" || dim.name.length === 0) {
        throw new Error(`Dimension ${idx} missing name`);
      }
      if (
        typeof dim.verdict !== "string" ||
        !VALID_VERDICTS.has(dim.verdict as DimensionVerdict)
      ) {
        throw new Error(
          `Dimension ${idx} ('${dim.name}') has invalid verdict '${dim.verdict}'; must be strong/developing/missing`
        );
      }
      if (typeof dim.observation !== "string" || dim.observation.length === 0) {
        throw new Error(`Dimension ${idx} ('${dim.name}') missing observation`);
      }
      return {
        name: dim.name,
        verdict: dim.verdict as DimensionVerdict,
        observation: dim.observation,
      };
    }
  );

  if (typeof obj.whatWorked !== "string" || obj.whatWorked.length === 0) {
    throw new Error("Feedback JSON missing whatWorked string");
  }
  if (typeof obj.whatMissed !== "string" || obj.whatMissed.length === 0) {
    throw new Error("Feedback JSON missing whatMissed string");
  }

  return {
    dimensions,
    whatWorked: obj.whatWorked,
    whatMissed: obj.whatMissed,
  };
}
