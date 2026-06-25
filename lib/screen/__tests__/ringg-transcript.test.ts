import { describe, expect, it } from "vitest";
import {
  parseRinggTranscript,
  mapTranscriptToTurns,
  isUnscorable,
  renderScreeningTranscript,
} from "@/lib/screen/transcript";

// Trimmed from a real GET /calling/call-details response (call
// 6c434fac…, agent Riya): `transcription_url` is a JSON-STRINGIFIED array of
// {bot}/{user} turns with message_id/timestamp noise.
const REAL_TRANSCRIPTION_URL =
  '[{"bot": "Hi Bhavya, ready to get started?", "message_id": "7489aa24", "timestamp": "2026-06-25T16:43:25.775+00:00"}, ' +
  '{"user": "Here we are. Super excited. Let\'s get into it.", "message_id": "a2ab0c42", "timestamp": "2026-06-25T16:43:30.379+00:00"}, ' +
  '{"bot": "Great! First up: Why Fireflies, and why this role specifically?", "message_id": "b38ca441"}]';

describe("parseRinggTranscript", () => {
  it("parses the real stringified payload into speaker-tagged entries", () => {
    const entries = parseRinggTranscript(REAL_TRANSCRIPTION_URL);
    expect(entries).toEqual([
      { speaker: "interviewer", text: "Hi Bhavya, ready to get started?" },
      { speaker: "candidate", text: "Here we are. Super excited. Let's get into it." },
      {
        speaker: "interviewer",
        text: "Great! First up: Why Fireflies, and why this role specifically?",
      },
    ]);
  });

  it("accepts an already-parsed array (in case the field shape changes)", () => {
    const entries = parseRinggTranscript([{ bot: "Hi" }, { user: "Hello" }]);
    expect(entries).toEqual([
      { speaker: "interviewer", text: "Hi" },
      { speaker: "candidate", text: "Hello" },
    ]);
  });

  it("never throws on malformed input — returns [] instead", () => {
    expect(parseRinggTranscript("not json")).toEqual([]);
    expect(parseRinggTranscript(null)).toEqual([]);
    expect(parseRinggTranscript(undefined)).toEqual([]);
    expect(parseRinggTranscript(42)).toEqual([]);
    expect(parseRinggTranscript('{"not":"an array"}')).toEqual([]);
  });

  it("skips entries that have neither a string bot nor user", () => {
    const entries = parseRinggTranscript(
      '[{"bot": "Hi"}, {"system": "ignored"}, {"user": 123}, {"user": "ok"}]'
    );
    expect(entries).toEqual([
      { speaker: "interviewer", text: "Hi" },
      { speaker: "candidate", text: "ok" },
    ]);
  });

  it("feeds the existing pipeline end to end (parse → turns → render)", () => {
    const turns = mapTranscriptToTurns(parseRinggTranscript(REAL_TRANSCRIPTION_URL));
    // candidate→user, interviewer→ai
    expect(turns.map((t) => t.speaker)).toEqual(["ai", "user", "ai"]);
    expect(isUnscorable(turns)).toBe(false);
    const rendered = renderScreeningTranscript(turns);
    expect(rendered).toContain("Interviewer: Hi Bhavya");
    expect(rendered).toContain("Candidate: Here we are");
  });

  it("flags a transcript with no candidate speech as unscorable", () => {
    const turns = mapTranscriptToTurns(
      parseRinggTranscript('[{"bot": "Hi, anyone there?"}]')
    );
    expect(isUnscorable(turns)).toBe(true);
  });
});
