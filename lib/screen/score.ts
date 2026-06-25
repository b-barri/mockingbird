import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { StructuredFeedback } from "@/lib/llm/summary";
import { type Brief, briefDimensionNames } from "@/lib/screen/brief";
import {
  screeningSystemPromptFor,
  assembleScreeningUserMessage,
  tryParseScreeningFeedback,
} from "@/lib/screen/feedback";
import {
  mapTranscriptToTurns,
  isUnscorable,
  type TranscriptEntry,
} from "@/lib/screen/transcript";

// Score a finished screening call into feedback.
//
// transcript entries → Turn[] → screening coach (Claude) → StructuredFeedback.
// The brief's eval-parameter names are the exact feedback dimensions, so the
// candidate is graded on precisely what the interview probed (see
// briefToRinggVariables: `signals` is sourced from the same parameters).
//
// Mirrors lib/research/generateBrief's Anthropic usage: buffered (non-stream)
// claude-sonnet-4-6 call with the BYO key, then a lenient parse.

export type ScoreResult =
  | { status: "scored"; feedback: StructuredFeedback }
  | { status: "unscorable" }
  | { status: "error"; error: string };

export interface ScoreScreeningInput {
  brief: Brief;
  entries: ReadonlyArray<TranscriptEntry>;
  apiKey: string;
}

export async function scoreScreening(
  input: ScoreScreeningInput
): Promise<ScoreResult> {
  const turns = mapTranscriptToTurns(input.entries);
  // No candidate speech (dropped call, mic failure) — nothing to grade.
  if (isUnscorable(turns)) return { status: "unscorable" };

  const dimensionNames = briefDimensionNames(input.brief);
  const anthropic = new Anthropic({ apiKey: input.apiKey });

  let rawText: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: screeningSystemPromptFor(input.brief),
      messages: [
        {
          role: "user",
          content: assembleScreeningUserMessage({ brief: input.brief, turns }),
        },
      ],
    });
    rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    return {
      status: "error",
      error: `Scoring call failed: ${
        err instanceof Error ? err.message : "unknown"
      }`,
    };
  }

  const parsed = tryParseScreeningFeedback(rawText, dimensionNames);
  if (!parsed.ok) return { status: "error", error: parsed.error };
  return { status: "scored", feedback: parsed.feedback };
}
