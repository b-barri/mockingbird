// Screening feedback — a FORK of the product-design coach, not a parameterization.
//
// Why a fork (review findings, P0): lib/llm/summary.ts is wired for product-
// design practice cases — its coach prompt hardcodes the interviewer identity
// ("Alex"), the first two dimension names ("Customer focus" / "Structure"), a
// "case tensions" framing, and `parseFeedback` THROWS unless it gets exactly 4
// dimensions. A company phone screen has none of that: its dimensions come from
// the brief's eval parameters (3, 4, 5, … of them) and there is no "Alex".
//
// So the screening path gets its own coach prompt and a lenient parser whose
// expected dimension count derives from the brief. The product-design path in
// lib/llm/summary.ts is left completely untouched, so its regression tests keep
// passing. We reuse only the OUTPUT types (StructuredFeedback et al.).

import type { Turn } from "@/lib/voice/state-machine";
import type {
  DimensionAssessment,
  DimensionVerdict,
  StructuredFeedback,
} from "@/lib/llm/summary";
import {
  type Brief,
  briefToRubric,
  briefDimensionNames,
} from "@/lib/screen/brief";
import { renderScreeningTranscript } from "@/lib/screen/transcript";

const VALID_VERDICTS: ReadonlySet<DimensionVerdict> = new Set([
  "strong",
  "developing",
  "missing",
]);

/** Thrown when the LLM response can't be coerced into valid screening feedback. */
export class ScreeningFeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreeningFeedbackError";
  }
}

/**
 * Coach system prompt for a screening interview. Built dynamically so the
 * dimension names are exactly the brief's eval-parameter names, in order — the
 * lenient parser then requires that exact set back.
 */
export function screeningCoachSystemPrompt(
  dimensionNames: ReadonlyArray<string>
): string {
  const n = dimensionNames.length;
  const slots = dimensionNames
    .map(
      (name) =>
        `    {"name": ${JSON.stringify(
          name
        )}, "verdict": "<strong|developing|missing>", "observation": "<10-20 words>"}`
    )
    .join(",\n");

  return `You are a senior screening interviewer. The candidate just finished a phone screen with you for a specific company and role, and you are now in coach mode, evaluating their performance.

The user message includes:
- The company and role
- A section titled "Evaluation parameters" describing exactly what this screen scores on
- The screen transcript (labeled "Interviewer" and "Candidate")

Read the transcript. Judge how well the candidate performed on each evaluation parameter.

OUTPUT FORMAT: Return ONLY a single JSON object matching this exact schema. No preamble, no markdown code fence, no trailing explanation — just the JSON object as the entire response.

{
  "dimensions": [
${slots}
  ],
  "whatWorked": "<one paragraph, 100-140 words>",
  "whatMissed": "<one paragraph, 100-140 words>"
}

Constraints on structure:
- Always exactly ${n} dimension${n === 1 ? "" : "s"}, named and ordered exactly as above — one per evaluation parameter. Do not add, drop, rename, or reorder them.
- Each verdict is exactly one of these three strings: "strong", "developing", "missing". No other vocabulary.

Constraints on content:
- Each observation is 10-20 words. Anchor it to a candidate moment (paraphrased or briefly quoted) OR to the parameter substance in plain language.
- whatWorked + whatMissed together total 240-280 words; each individual paragraph is 100-140 words.
- whatWorked can be shorter if genuinely little worked — do not manufacture praise.
- whatMissed is prescriptive: name what a stronger candidate would have done differently, not just what was absent.

Things that must NEVER appear in any field:
- Framework names ("CIRCLES", "AARM", "Goals-Signals-Metrics", or any analogous acronym) or checklist/step language.
- Generic praise or criticism without an anchor ("good structure", "be more specific").
- Sycophancy ("great job", "well done").
- Numeric scores, percentages, or ordinal ratings of any kind. Categorical verdicts only.

Tone: direct, honest, senior voice. One sharp specific observation beats three rounded encouragements.`;
}

export interface AssembleScreeningInput {
  brief: Brief;
  turns: ReadonlyArray<Turn>;
}

export function assembleScreeningUserMessage(
  input: AssembleScreeningInput
): string {
  const transcript = renderScreeningTranscript(input.turns);
  return `Company: ${input.brief.company}
Role: ${input.brief.role}

${briefToRubric(input.brief)}

Transcript:

${transcript}

Now produce the feedback as JSON.`;
}

/** Convenience: the system prompt for a given brief. */
export function screeningSystemPromptFor(brief: Brief): string {
  return screeningCoachSystemPrompt(briefDimensionNames(brief));
}

/**
 * Parse the LLM JSON response into StructuredFeedback. Lenient on dimension
 * COUNT (it must match the brief's parameter count, whatever that is) but
 * strict on shape and verdict vocabulary. Throws ScreeningFeedbackError on any
 * mismatch — callers in the async path should use `tryParseScreeningFeedback`
 * so a bad response never becomes an unhandled throw.
 */
export function parseScreeningFeedback(
  raw: string,
  expectedDimensionNames: ReadonlyArray<string>
): StructuredFeedback {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonStr = fenceMatch ? fenceMatch[1] : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new ScreeningFeedbackError(
      `Could not parse feedback as JSON: ${
        err instanceof Error ? err.message : "unknown error"
      }`
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ScreeningFeedbackError("Feedback JSON must be an object");
  }
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.dimensions)) {
    throw new ScreeningFeedbackError(
      "Feedback JSON must have a 'dimensions' array"
    );
  }
  const expectedCount = expectedDimensionNames.length;
  if (obj.dimensions.length !== expectedCount) {
    throw new ScreeningFeedbackError(
      `Feedback JSON must have exactly ${expectedCount} dimensions (one per eval parameter); got ${obj.dimensions.length}`
    );
  }

  const dimensions: DimensionAssessment[] = obj.dimensions.map(
    (d: unknown, idx: number) => {
      if (!d || typeof d !== "object") {
        throw new ScreeningFeedbackError(`Dimension ${idx} is not an object`);
      }
      const dim = d as Record<string, unknown>;
      if (typeof dim.name !== "string" || dim.name.length === 0) {
        throw new ScreeningFeedbackError(`Dimension ${idx} missing name`);
      }
      if (
        typeof dim.verdict !== "string" ||
        !VALID_VERDICTS.has(dim.verdict as DimensionVerdict)
      ) {
        throw new ScreeningFeedbackError(
          `Dimension ${idx} ('${dim.name}') has invalid verdict '${dim.verdict}'; must be strong/developing/missing`
        );
      }
      if (typeof dim.observation !== "string" || dim.observation.length === 0) {
        throw new ScreeningFeedbackError(
          `Dimension ${idx} ('${dim.name}') missing observation`
        );
      }
      return {
        name: dim.name,
        verdict: dim.verdict as DimensionVerdict,
        observation: dim.observation,
      };
    }
  );

  if (typeof obj.whatWorked !== "string" || obj.whatWorked.length === 0) {
    throw new ScreeningFeedbackError("Feedback JSON missing whatWorked string");
  }
  if (typeof obj.whatMissed !== "string" || obj.whatMissed.length === 0) {
    throw new ScreeningFeedbackError("Feedback JSON missing whatMissed string");
  }

  return {
    dimensions,
    whatWorked: obj.whatWorked,
    whatMissed: obj.whatMissed,
  };
}

export type ScreeningFeedbackResult =
  | { ok: true; feedback: StructuredFeedback }
  | { ok: false; error: string };

/**
 * Non-throwing wrapper for the async feedback path (the webhook generates
 * feedback minutes after a paid call — an unhandled throw there would silently
 * drop the result with no user-facing retry surface). Always returns a typed
 * result.
 */
export function tryParseScreeningFeedback(
  raw: string,
  expectedDimensionNames: ReadonlyArray<string>
): ScreeningFeedbackResult {
  try {
    return {
      ok: true,
      feedback: parseScreeningFeedback(raw, expectedDimensionNames),
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "unknown feedback parse error",
    };
  }
}
