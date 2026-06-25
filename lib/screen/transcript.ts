// Screening-call transcript → Turn[] mapper.
//
// The mock screening call (Ringg, deferred) returns a transcript of alternating
// interviewer/candidate utterances. This maps that into the existing `Turn`
// shape so the screening feedback path can reuse the same primitives as the
// product-design coach — but with NEUTRAL speaker labels ("Interviewer" /
// "Candidate"), not the hardcoded "Alex" the product-design renderer uses.
//
// Defensive by design (review finding A4 / de-risk note): real telephony
// transcripts arrive empty, single-merged-turn, or without clean speaker
// boundaries. The mapper never throws on malformed input — it drops empty
// utterances and falls back to a single candidate turn when speakers can't be
// distinguished, so the feedback path downstream always has something to score
// or can cleanly report "unscorable".

import type { Turn } from "@/lib/voice/state-machine";

export type ScreenSpeaker = "interviewer" | "candidate";

/** A raw transcript entry as delivered by the call provider. */
export interface TranscriptEntry {
  readonly speaker: ScreenSpeaker;
  readonly text: string;
}

/**
 * Parse Ringg's transcript into provider-neutral TranscriptEntry[].
 *
 * Ringg delivers the transcript in the `transcription_url` field of
 * GET /calling/call-details (and in the completion webhook). The name is a
 * double misnomer: it is NOT a URL, and it is NOT a parsed array — it is a
 * JSON-*stringified* array of turn objects, each keyed by either `bot` (the
 * interviewer) or `user` (the candidate), plus message_id/timestamp noise:
 *   "[{\"bot\":\"Hi…\",\"message_id\":\"…\"}, {\"user\":\"Hello\"}]"
 *
 * So the full pipeline from an API response is:
 *   mapTranscriptToTurns(parseRinggTranscript(data.transcription_url))
 *
 * Defensive (matching this module's philosophy): never throws. A non-JSON
 * string, null, or non-array yields []; entries lacking a string bot/user are
 * skipped. `bot` → interviewer, `user` → candidate.
 */
export function parseRinggTranscript(raw: unknown): TranscriptEntry[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  const entries: TranscriptEntry[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.bot === "string") {
      entries.push({ speaker: "interviewer", text: obj.bot });
    } else if (typeof obj.user === "string") {
      entries.push({ speaker: "candidate", text: obj.user });
    }
  }
  return entries;
}

/**
 * Map provider transcript entries into the app's `Turn[]` shape.
 *
 * - Empty / whitespace-only utterances are dropped (telephony noise).
 * - The `speaker` maps to the app's binary `user`/`ai` axis: candidate→user,
 *   interviewer→ai. Neutral display labels are applied at render time
 *   (renderScreeningTranscript), not baked into the turn.
 */
export function mapTranscriptToTurns(
  entries: ReadonlyArray<TranscriptEntry>
): Turn[] {
  const turns: Turn[] = [];
  entries.forEach((entry, idx) => {
    const text = entry.text?.trim() ?? "";
    if (!text) return;
    turns.push({
      id: `screen-${idx}`,
      speaker: entry.speaker === "candidate" ? "user" : "ai",
      text,
      timestamp: idx,
      partial: false,
      stricken: false,
    });
  });
  return turns;
}

/** True when there is no candidate speech to evaluate. */
export function isUnscorable(turns: ReadonlyArray<Turn>): boolean {
  return !turns.some((t) => t.speaker === "user" && t.text.trim().length > 0);
}

/**
 * Render turns as a transcript string with NEUTRAL labels. The product-design
 * renderer (lib/llm/summary.ts) hardcodes "Alex"; a company screen has no
 * "Alex", so the interviewer is labeled "Interviewer".
 */
export function renderScreeningTranscript(
  turns: ReadonlyArray<Turn>
): string {
  return turns
    .filter((t) => !t.stricken && !t.partial && t.text.trim().length > 0)
    .map((t) => `${t.speaker === "user" ? "Candidate" : "Interviewer"}: ${t.text}`)
    .join("\n\n");
}
